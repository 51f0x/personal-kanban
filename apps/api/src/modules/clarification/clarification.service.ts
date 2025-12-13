import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@personal-kanban/shared";
import { ColumnType, TaskEventType } from "@prisma/client";

import { BoardGateway } from "../realtime/board.gateway";
import { ClarifyTaskDto } from "./dto/clarify-task.input";

export interface ClarificationResult {
  task: {
    id: string;
    title: string;
    columnId: string;
  };
  targetColumn: {
    id: string;
    name: string;
    type: ColumnType;
  };
  decision: string;
}

@Injectable()
export class ClarificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardGateway: BoardGateway,
  ) {}

  /**
   * Get the next unclarified task from the Input column
   */
  async getNextUnclarified(boardId: string) {
    // Find tasks in INPUT columns that need clarification
    const task = await this.prisma.task.findFirst({
      where: {
        boardId,
        column: { type: ColumnType.INPUT },
        isDone: false,
      },
      orderBy: { createdAt: "asc" },
      include: {
        column: true,
        project: true,
        tags: { include: { tag: true } },
        checklist: { orderBy: { position: "asc" } },
      },
    });

    if (!task) {
      return null;
    }

    // Get count of remaining unclarified tasks
    const remainingCount = await this.prisma.task.count({
      where: {
        boardId,
        column: { type: ColumnType.INPUT },
        isDone: false,
      },
    });

    return {
      task,
      remainingCount,
    };
  }

  /**
   * Apply clarification decisions to a task
   */
  async clarifyTask(
    taskId: string,
    input: ClarifyTaskDto,
  ): Promise<ClarificationResult> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { column: true, board: { include: { columns: true } } },
    });

    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }

    // Determine target column based on GTD decision tree
    let targetColumnType: ColumnType;
    let decision: string;

    if (!input.actionable) {
      // Non-actionable: route to Someday/Maybe, Archive, or delete
      switch (input.nonActionableDestination) {
        case "archive":
          targetColumnType = ColumnType.ARCHIVE;
          decision = "Not actionable - archived for reference";
          break;
        case "delete":
          // Delete the task instead of moving
          await this.prisma.task.delete({ where: { id: taskId } });
          this.boardGateway.emitBoardUpdate(task.boardId, {
            type: "task.deleted",
            taskId,
            timestamp: new Date().toISOString(),
          });
          return {
            task: { id: taskId, title: task.title, columnId: "" },
            targetColumn: { id: "", name: "Deleted", type: ColumnType.ARCHIVE },
            decision: "Not actionable - deleted",
          };
        default:
          targetColumnType = ColumnType.SOMEDAY;
          decision = "Not actionable - added to Someday/Maybe";
      }
    } else if (input.twoMinute) {
      // Actionable + less than 2 minutes = Done Immediately
      targetColumnType = ColumnType.DONE;
      decision = "Two-minute rule - completed immediately";
    } else if (input.waitingFor) {
      // Waiting on someone
      targetColumnType = ColumnType.WAITING;
      decision = `Waiting for: ${input.waitingFor}`;
    } else if (input.context) {
      // Has a context = Context column
      targetColumnType = ColumnType.CONTEXT;
      decision = `Assigned to context: ${input.context}`;
    } else {
      // Default to Clarify/Next Actions
      targetColumnType = ColumnType.CLARIFY;
      decision = "Added to Next Actions";
    }

    // Find the appropriate column
    let targetColumn = task.board.columns.find(
      (c) => c.type === targetColumnType,
    );

    // If no specific column found for context, try to find one that matches the context name
    if (!targetColumn && input.context) {
      targetColumn = task.board.columns.find(
        (c) =>
          c.type === ColumnType.CONTEXT &&
          c.name.toLowerCase().includes(input.context!.toLowerCase()),
      );
    }

    // Fallback: use first column of the target type, or the clarify column
    if (!targetColumn) {
      targetColumn = task.board.columns.find(
        (c) => c.type === targetColumnType,
      );
    }
    if (!targetColumn) {
      targetColumn = task.board.columns.find(
        (c) => c.type === ColumnType.CLARIFY,
      );
    }
    if (!targetColumn) {
      throw new BadRequestException(
        `No suitable column found for ${targetColumnType}`,
      );
    }

    const fromColumnId = task.columnId;

    // Update the task
    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          columnId: targetColumn!.id,
          title: input.nextAction || task.title,
          context: input.context ?? task.context,
          projectId:
            input.projectId === null
              ? null
              : (input.projectId ?? task.projectId),
          waitingFor: input.waitingFor ?? task.waitingFor,
          dueAt: input.dueAt ?? task.dueAt,
          needsBreakdown: input.needsBreakdown ?? task.needsBreakdown,
          lastMovedAt: new Date(),
          isDone: targetColumnType === ColumnType.DONE,
          completedAt: targetColumnType === ColumnType.DONE ? new Date() : null,
        },
      });

      // Create TaskEvent for clarification
      await tx.taskEvent.create({
        data: {
          taskId,
          boardId: task.boardId,
          type: TaskEventType.MOVED,
          fromColumnId,
          toColumnId: targetColumn!.id,
          payload: {
            clarification: true,
            decision,
            actionable: input.actionable,
            twoMinute: input.twoMinute,
            context: input.context,
          },
        },
      });

      return updated;
    });

    // Emit WebSocket update
    this.boardGateway.emitBoardUpdate(task.boardId, {
      type: "task.clarified",
      taskId,
      fromColumnId,
      toColumnId: targetColumn.id,
      decision,
      timestamp: new Date().toISOString(),
    });

    return {
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        columnId: updatedTask.columnId,
      },
      targetColumn: {
        id: targetColumn.id,
        name: targetColumn.name,
        type: targetColumn.type,
      },
      decision,
    };
  }

  /**
   * Get clarification statistics for a board
   */
  async getStats(boardId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUnclarified, clarifiedToday] = await Promise.all([
      this.prisma.task.count({
        where: {
          boardId,
          column: { type: ColumnType.INPUT },
          isDone: false,
        },
      }),
      this.prisma.taskEvent.count({
        where: {
          boardId,
          type: TaskEventType.MOVED,
          payload: {
            path: ["clarification"],
            equals: true,
          },
          createdAt: { gte: today },
        },
      }),
    ]);

    return {
      boardId,
      totalUnclarified,
      clarifiedToday,
      averageClarificationTimeSec: 0, // TODO: Calculate from events
    };
  }
}
