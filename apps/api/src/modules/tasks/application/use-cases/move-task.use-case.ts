import  { PrismaService } from "@personal-kanban/shared";
import  { Prisma } from "@prisma/client";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ColumnId,
   IColumnRepository,
   IEventBus,
   ITaskRepository,
  Task,
  TaskId,
} from "@personal-kanban/shared";

import  { WipService } from "../../../boards/wip.service";
import  { MoveTaskDto, MoveTaskResult } from "../../dto/move-task.input";

/**
 * MoveTaskUseCase
 * Encapsulates the business logic for moving a task to a different column
 */
@Injectable()
export class MoveTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("ITaskRepository") private readonly taskRepository: ITaskRepository,
    @Inject("IColumnRepository")
    private readonly columnRepository: IColumnRepository,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
    private readonly wipService: WipService,
  ) {}

  async execute(id: string, input: MoveTaskDto): Promise<MoveTaskResult> {
    // Get the current task
    const taskId = TaskId.from(id);
    const taskData = await this.taskRepository.findById(taskId, {
      includeColumn: true,
    });

    if (!taskData) {
      throw new NotFoundException(`Task not found: ${id}`);
    }

    // Convert to Task entity
    const task = Task.fromPersistence(taskData);
    const fromColumnId = task.columnId.value;

    // If moving to the same column, handle reordering
    if (fromColumnId === input.columnId) {
      // If position is provided, reorder tasks within the column
      if (input.position !== undefined) {
        await this.reorderTaskInColumn(id, input.columnId, input.position);
      }

      const wipStatus = await this.wipService.checkWipLimit(input.columnId);
      return {
        task: {
          id: task.id,
          title: task.title,
          columnId: task.columnId.value,
          boardId: task.boardId.value,
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
    const targetColumnId = ColumnId.from(input.columnId);
    const targetColumn = await this.columnRepository.findById(targetColumnId);

    if (!targetColumn) {
      throw new NotFoundException(`Target column not found: ${input.columnId}`);
    }

    if (
      !(await this.columnRepository.belongsToBoard(
        targetColumnId,
        task.boardId,
      ))
    ) {
      throw new BadRequestException(
        "Cannot move task to a column on a different board",
      );
    }

    // Check WIP limit on target column
    const wipStatus = await this.wipService.checkWipLimit(input.columnId, id);

    if (wipStatus.wouldExceed && !input.forceWipOverride) {
      throw new BadRequestException({
        message: `WIP limit exceeded for column "${wipStatus.columnName}". Current: ${wipStatus.currentCount}, Limit: ${wipStatus.wipLimit}`,
        code: "WIP_LIMIT_EXCEEDED",
        wipStatus,
      });
    }

    // Get current max position in target column to determine new position
    const maxPosition =
      await this.taskRepository.getMaxPositionInColumn(targetColumnId);

    // If position is provided, use it (and reorder other tasks)
    // Otherwise, place at the end
    const targetPosition =
      input.position !== undefined ? input.position : maxPosition + 1;

    // Use entity's moveToColumn method
    task.moveToColumn(
      targetColumnId,
      targetPosition,
      targetColumn.type,
      input.forceWipOverride || false,
    );

    // Perform the move within a transaction
    const updatedTask = await this.prisma.$transaction(async (tx) => {
      // If position is specified, reorder tasks in the target column
      if (input.position !== undefined) {
        await this.reorderTaskInColumnTransaction(
          tx,
          id,
          input.columnId,
          targetPosition,
        );
      }

      // Update the task using entity's persistence data
      const taskData = task.toPersistence();
      const updated = await tx.task.update({
        where: { id },
        data: {
          columnId: taskData.columnId,
          position: taskData.position,
          lastMovedAt: taskData.lastMovedAt,
          isDone: taskData.isDone,
          completedAt: taskData.completedAt,
        },
      });

      return updated;
    });

    // Publish domain events from the entity
    const domainEvents = task.domainEvents;
    if (domainEvents.length > 0) {
      await this.eventBus.publishAll([...domainEvents]);
      task.clearDomainEvents();
    }

    // Get updated WIP status
    const updatedWipStatus = await this.wipService.checkWipLimit(
      input.columnId,
    );

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
   * Reorder a task within its column
   */
  private async reorderTaskInColumn(
    taskId: string,
    columnId: string,
    newPosition: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.reorderTaskInColumnTransaction(
        tx,
        taskId,
        columnId,
        newPosition,
      );
    });
  }

  /**
   * Reorder a task within its column (transaction version)
   */
  private async reorderTaskInColumnTransaction(
    tx: Prisma.TransactionClient,
    taskId: string,
    columnId: string,
    newPosition: number,
  ): Promise<void> {
    // Get the current task
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { position: true },
    });

    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }

    const oldPosition = task.position;

    // If position hasn't changed, no need to reorder
    if (oldPosition === newPosition) {
      return;
    }

    // Get all tasks in the column, ordered by position
    const tasksInColumn = await tx.task.findMany({
      where: { columnId, id: { not: taskId } },
      select: { id: true, position: true },
      orderBy: { position: "asc" },
    });

    // Update the moved task's position
    await tx.task.update({
      where: { id: taskId },
      data: { position: newPosition },
    });

    // Shift other tasks' positions
    if (newPosition < oldPosition) {
      // Moving up: increment positions of tasks between newPosition and oldPosition
      const tasksToShift = tasksInColumn.filter(
        (t) => t.position >= newPosition && t.position < oldPosition,
      );
      for (const t of tasksToShift) {
        await tx.task.update({
          where: { id: t.id },
          data: { position: t.position + 1 },
        });
      }
    } else {
      // Moving down: decrement positions of tasks between oldPosition and newPosition
      const tasksToShift = tasksInColumn.filter(
        (t) => t.position > oldPosition && t.position <= newPosition,
      );
      for (const t of tasksToShift) {
        await tx.task.update({
          where: { id: t.id },
          data: { position: t.position - 1 },
        });
      }
    }
  }
}
