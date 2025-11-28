import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskEventType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BoardGateway } from '../realtime/board.gateway';
import { WipService, WipStatus } from '../boards/wip.service';
import { CreateTaskDto } from './dto/create-task.input';
import { UpdateTaskDto } from './dto/update-task.input';
import { MoveTaskDto, MoveTaskResult } from './dto/move-task.input';

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardGateway: BoardGateway,
    private readonly wipService: WipService,
  ) {}

  async createTask(input: CreateTaskDto) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          boardId: input.boardId,
          columnId: input.columnId,
          ownerId: input.ownerId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          context: input.context,
          waitingFor: input.waitingFor,
          dueAt: input.dueAt,
          needsBreakdown: input.needsBreakdown ?? false,
          metadata: input.metadata ?? Prisma.JsonNull,
        },
      });

      if (input.tags?.length) {
        await tx.taskTag.createMany({
          data: input.tags.map((tagId) => ({ taskId: task.id, tagId })),
          skipDuplicates: true,
        });
      }

      if (input.checklist?.length) {
        await tx.checklistItem.createMany({
          data: input.checklist.map((item, index) => ({
            taskId: task.id,
            title: item.title,
            isDone: item.isDone ?? false,
            position: item.position ?? index,
          })),
        });
      }

      await tx.taskEvent.create({
        data: {
          taskId: task.id,
          boardId: task.boardId,
          type: TaskEventType.CREATED,
          toColumnId: task.columnId,
        },
      });

      this.boardGateway.emitBoardUpdate(task.boardId, { type: 'task.created', taskId: task.id });
      return task;
    });
  }

  async updateTask(id: string, input: UpdateTaskDto) {
    const { tags, columnId, projectId, metadata, ...rest } = input;

    const data: Prisma.TaskUpdateInput = {
      ...rest,
      metadata:
        metadata === undefined ? undefined : metadata === null ? Prisma.JsonNull : metadata,
      project:
        projectId === undefined
          ? undefined
          : projectId === null
            ? { disconnect: true }
            : { connect: { id: projectId } },
      column:
        columnId === undefined
          ? undefined
          : {
              connect: { id: columnId },
            },
    };

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data,
      });

      if (tags) {
        await tx.taskTag.deleteMany({ where: { taskId: id } });
        if (tags.length) {
          await tx.taskTag.createMany({
            data: tags.map((tagId) => ({ taskId: id, tagId })),
            skipDuplicates: true,
          });
        }
      }

      await tx.taskEvent.create({
        data: {
          taskId: id,
          boardId: task.boardId,
          type: TaskEventType.UPDATED,
        },
      });

      this.boardGateway.emitBoardUpdate(task.boardId, { type: 'task.updated', taskId: task.id });
      return task;
    });
  }

  getTaskById(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        checklist: { orderBy: { position: 'asc' } },
        tags: { include: { tag: true } },
      },
    });
  }

  listTasksForBoard(boardId: string) {
    return this.prisma.task.findMany({
      where: { boardId },
      include: {
        column: true,
        project: true,
        tags: { include: { tag: true } },
      },
      orderBy: [{ lastMovedAt: 'asc' }],
    });
  }

  /**
   * Move a task to a different column with WIP limit validation
   */
  async moveTask(id: string, input: MoveTaskDto): Promise<MoveTaskResult> {
    // Get the current task
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { column: true },
    });

    if (!task) {
      throw new NotFoundException(`Task not found: ${id}`);
    }

    const fromColumnId = task.columnId;

    // If moving to the same column, just return current state
    if (fromColumnId === input.columnId) {
      const wipStatus = await this.wipService.checkWipLimit(input.columnId);
      return {
        task: {
          id: task.id,
          title: task.title,
          columnId: task.columnId,
          boardId: task.boardId,
        },
        wipStatus: {
          columnId: wipStatus.columnId,
          columnName: wipStatus.columnName,
          currentCount: wipStatus.currentCount,
          wipLimit: wipStatus.wipLimit,
          atLimit: wipStatus.wouldExceed,
        },
        fromColumnId: null,
      };
    }

    // Check the target column exists and belongs to the same board
    const targetColumn = await this.prisma.column.findUnique({
      where: { id: input.columnId },
    });

    if (!targetColumn) {
      throw new NotFoundException(`Target column not found: ${input.columnId}`);
    }

    if (targetColumn.boardId !== task.boardId) {
      throw new BadRequestException('Cannot move task to a column on a different board');
    }

    // Check WIP limit on target column
    const wipStatus = await this.wipService.checkWipLimit(input.columnId, id);

    if (wipStatus.wouldExceed && !input.forceWipOverride) {
      throw new BadRequestException({
        message: `WIP limit exceeded for column "${wipStatus.columnName}". Current: ${wipStatus.currentCount}, Limit: ${wipStatus.wipLimit}`,
        code: 'WIP_LIMIT_EXCEEDED',
        wipStatus,
      });
    }

    // Perform the move within a transaction
    const updatedTask = await this.prisma.$transaction(async (tx) => {
      // Update the task
      const updated = await tx.task.update({
        where: { id },
        data: {
          columnId: input.columnId,
          lastMovedAt: new Date(),
          // If moving to a Done column, mark as done
          isDone: targetColumn.type === 'DONE',
          completedAt: targetColumn.type === 'DONE' ? new Date() : task.completedAt,
        },
      });

      // Create TaskEvent for the move
      await tx.taskEvent.create({
        data: {
          taskId: id,
          boardId: task.boardId,
          type: TaskEventType.MOVED,
          fromColumnId,
          toColumnId: input.columnId,
          payload: {
            fromColumnName: task.column.name,
            toColumnName: targetColumn.name,
            wipOverride: input.forceWipOverride || false,
          },
        },
      });

      return updated;
    });

    // Emit WebSocket update
    this.boardGateway.emitBoardUpdate(task.boardId, {
      type: 'task.moved',
      taskId: id,
      fromColumnId,
      toColumnId: input.columnId,
      timestamp: new Date().toISOString(),
    });

    // Get updated WIP status
    const updatedWipStatus = await this.wipService.checkWipLimit(input.columnId);

    return {
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        columnId: updatedTask.columnId,
        boardId: updatedTask.boardId,
      },
      wipStatus: {
        columnId: updatedWipStatus.columnId,
        columnName: updatedWipStatus.columnName,
        currentCount: updatedWipStatus.currentCount,
        wipLimit: updatedWipStatus.wipLimit,
        atLimit: updatedWipStatus.wouldExceed,
      },
      fromColumnId,
    };
  }

  /**
   * Get tasks that are stale (not moved in X days)
   */
  async getStaleTasks(boardId: string, thresholdDays: number = 7) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    return this.prisma.task.findMany({
      where: {
        boardId,
        isDone: false,
        lastMovedAt: { lt: thresholdDate },
        column: {
          type: { notIn: ['DONE', 'ARCHIVE', 'SOMEDAY'] },
        },
      },
      include: {
        column: true,
        project: true,
      },
      orderBy: { lastMovedAt: 'asc' },
    });
  }

  /**
   * Mark a task as stale
   */
  async markStale(id: string, isStale: boolean = true) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data: { stale: isStale },
      });

      if (isStale) {
        await tx.taskEvent.create({
          data: {
            taskId: id,
            boardId: task.boardId,
            type: TaskEventType.STALE,
          },
        });
      }

      return task;
    });
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: { boardId: true },
    });

    if (!task) {
      throw new NotFoundException(`Task not found: ${id}`);
    }

    await this.prisma.task.delete({ where: { id } });

    this.boardGateway.emitBoardUpdate(task.boardId, {
      type: 'task.deleted',
      taskId: id,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }
}
