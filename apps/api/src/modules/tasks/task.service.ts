import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@personal-kanban/shared';
import { WipService } from '../boards/wip.service';
import { CreateTaskDto } from './dto/create-task.input';
import { UpdateTaskDto } from './dto/update-task.input';
import { MoveTaskDto, MoveTaskResult } from './dto/move-task.input';
import {
    ITaskRepository,
    IColumnRepository,
    IEventBus,
    TaskId,
    BoardId,
    ColumnId,
    TaskCreatedEvent,
    TaskMovedEvent,
    TaskUpdatedEvent,
    TaskDeletedEvent,
    TaskStaleEvent,
} from '@personal-kanban/shared';

@Injectable()
export class TaskService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject('ITaskRepository') private readonly taskRepository: ITaskRepository,
        @Inject('IColumnRepository') private readonly columnRepository: IColumnRepository,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
        private readonly wipService: WipService,
    ) {}

    async createTask(input: CreateTaskDto) {
        // Task creation is immediate - LLM analysis happens asynchronously in worker
        // Use explicit input values only
        const context = input.context ?? null;
        const waitingFor = input.waitingFor ?? null;
        const dueAt = input.dueAt ?? null;
        const needsBreakdown = input.needsBreakdown ?? false;

        // Build metadata object from input only
        const metadata: Record<string, unknown> = {
            ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
        };

        // Get the max position in the target column to place new task at the end
        const columnId = ColumnId.from(input.columnId);
        const newPosition = (await this.taskRepository.getMaxPositionInColumn(columnId)) + 1;

        return this.prisma.$transaction(async (tx) => {

            const task = await tx.task.create({
                data: {
                    boardId: input.boardId,
                    columnId: input.columnId,
                    ownerId: input.ownerId,
                    projectId: input.projectId,
                    title: input.title,
                    description: input.description,
                    context,
                    waitingFor,
                    dueAt,
                    needsBreakdown,
                    position: newPosition,
                    metadata:
                        Object.keys(metadata).length > 0
                            ? (metadata as Prisma.InputJsonValue)
                            : Prisma.JsonNull,
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

            return task;
        });
    }

    async updateTask(id: string, input: UpdateTaskDto) {
        const { tags, columnId, projectId, metadata, ...rest } = input;
        const taskId = TaskId.from(id);

        // Build update data for repository
        const updateData: any = {
            ...rest,
            metadata: metadata === undefined ? undefined : metadata === null ? null : metadata,
            projectId: projectId === undefined ? undefined : projectId === null ? null : projectId,
            columnId: columnId === undefined ? undefined : columnId,
        };

        // Update task using repository
        const task = await this.taskRepository.update(taskId, updateData);

        return this.prisma.$transaction(async (tx) => {
            // Get updated task for boardId
            const taskData = await tx.task.findUnique({
                where: { id },
                select: { boardId: true },
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

            return task;
        }).then(async (task) => {
            // Publish domain event after transaction commits
            const taskId = TaskId.from(task.id);
            const boardId = BoardId.from(task.boardId);
            await this.eventBus.publish(new TaskUpdatedEvent(taskId, boardId, updateData));
            return task;
        });
    }

    async getTaskById(id: string) {
        const taskId = TaskId.from(id);
        const task = await this.taskRepository.findById(taskId, {
            includeChecklist: true,
            includeTags: true,
            includeHints: true,
        });

        if (!task) {
            return null;
        }

        // Map to Prisma format for backward compatibility
        // TODO: In Phase 3, return domain entity instead
        return {
            ...task,
            checklist: task.checklist || [],
            tags: task.tags || [],
            hints: task.hints || [],
        };
    }

    async listTasksForBoard(boardId: string) {
        const boardIdVO = BoardId.from(boardId);
        const tasks = await this.taskRepository.findByBoardId(boardIdVO, {
            includeColumn: true,
            includeProject: true,
            includeTags: true,
            includeHints: true,
        });

        // Map to Prisma format for backward compatibility
        // TODO: In Phase 3, return domain entities instead
        return tasks.map((task) => ({
            ...task,
            column: task.column,
            project: task.project,
            tags: task.tags || [],
            hints: task.hints || [],
        }));
    }

    /**
     * Move a task to a different column with WIP limit validation
     * Also handles reordering tasks within the same column
     */
    async moveTask(id: string, input: MoveTaskDto): Promise<MoveTaskResult> {
        // Get the current task
        const taskId = TaskId.from(id);
        const task = await this.taskRepository.findById(taskId, {
            includeColumn: true,
        });

        if (!task) {
            throw new NotFoundException(`Task not found: ${id}`);
        }

        const fromColumnId = task.columnId;

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
        const targetColumnId = ColumnId.from(input.columnId);
        const targetColumn = await this.columnRepository.findById(targetColumnId);

        if (!targetColumn) {
            throw new NotFoundException(`Target column not found: ${input.columnId}`);
        }

        const taskBoardId = BoardId.from(task.boardId);
        if (!(await this.columnRepository.belongsToBoard(targetColumnId, taskBoardId))) {
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

        // Get current max position in target column to determine new position
        const maxPosition = await this.taskRepository.getMaxPositionInColumn(targetColumnId);

        // If position is provided, use it (and reorder other tasks)
        // Otherwise, place at the end
        const targetPosition = input.position !== undefined ? input.position : maxPosition + 1;

        // Perform the move within a transaction
        const updatedTask = await this.prisma.$transaction(async (tx) => {
            // If position is specified, reorder tasks in the target column
            if (input.position !== undefined) {
                await this.reorderTaskInColumnTransaction(tx, id, input.columnId, targetPosition);
            }

            // Update the task
            const updated = await tx.task.update({
                where: { id },
                data: {
                    columnId: input.columnId,
                    position: targetPosition,
                    lastMovedAt: new Date(),
                    // If moving to a Done column, mark as done
                    isDone: targetColumn.type === 'DONE',
                    completedAt: targetColumn.type === 'DONE' ? new Date() : task.completedAt,
                },
            });

            return updated;
        }).then(async (updated) => {
            // Publish domain event after transaction commits
            const taskId = TaskId.from(id);
            const boardId = BoardId.from(task.boardId);
            const fromColumnIdVO = fromColumnId ? ColumnId.from(fromColumnId) : null;
            const toColumnIdVO = ColumnId.from(input.columnId);
            await this.eventBus.publish(
                new TaskMovedEvent(
                    taskId,
                    boardId,
                    fromColumnIdVO,
                    toColumnIdVO,
                    targetPosition,
                    input.forceWipOverride || false,
                ),
            );
            return updated;
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
     * Reorder a task within its column
     * This method handles the reordering logic when moving a task to a new position
     */
    private async reorderTaskInColumn(
        taskId: string,
        columnId: string,
        newPosition: number,
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await this.reorderTaskInColumnTransaction(tx, taskId, columnId, newPosition);
        });
    }

    /**
     * Reorder a task within its column (transaction version)
     * Shifts other tasks' positions to make room for the moved task
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
            orderBy: { position: 'asc' },
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

    /**
     * Get tasks that are stale (not moved in X days)
     */
    async getStaleTasks(boardId: string, thresholdDays: number = 7) {
        // Use repository method for finding stale tasks
        // Note: Repository method doesn't filter by column type, so we'll filter after
        const staleTasks = await this.taskRepository.findStaleTasks(thresholdDays);
        
        // Filter by board and column type
        const boardIdVO = BoardId.from(boardId);
        const boardTasks = await this.taskRepository.findByBoardId(boardIdVO, {
            includeColumn: true,
            includeProject: true,
        });

        // Filter tasks that are stale, not done, and not in excluded column types
        const excludedTypes = ['DONE', 'ARCHIVE', 'SOMEDAY'];
        const staleTaskIds = new Set(staleTasks.map(t => t.id));
        
        return boardTasks
            .filter(task => 
                staleTaskIds.has(task.id) && 
                !task.isDone && 
                task.column &&
                !excludedTypes.includes(task.column.type)
            )
            .sort((a, b) => a.lastMovedAt.getTime() - b.lastMovedAt.getTime());
    }

    /**
     * Mark a task as stale
     */
    async markStale(id: string, isStale: boolean = true) {
        const taskId = TaskId.from(id);
        const task = await this.taskRepository.update(taskId, { stale: isStale });

        return this.prisma.$transaction(async (tx) => {
            // Get task for boardId
            const taskData = await tx.task.findUnique({
                where: { id },
                select: { boardId: true },
            });

            return task;
        }).then(async (task) => {
            // Publish domain event after transaction commits
            if (isStale) {
                const taskId = TaskId.from(id);
                const boardId = BoardId.from(task.boardId);
                await this.eventBus.publish(new TaskStaleEvent(taskId, boardId, isStale));
            }
            return task;
        });
    }

    /**
     * Delete a task and all related records
     */
    async deleteTask(id: string) {
        const taskId = TaskId.from(id);
        const task = await this.taskRepository.findById(taskId);

        if (!task) {
            throw new NotFoundException(`Task not found: ${id}`);
        }

        const boardId = task.boardId;

        // Delete task and all related records in a transaction
        // TaskTag has onDelete: Cascade, but TaskEvent and ChecklistItem don't
        await this.prisma.$transaction(async (tx) => {
            // Delete TaskEvents first
            await tx.taskEvent.deleteMany({
                where: { taskId: id },
            });

            // Delete ChecklistItems
            await tx.checklistItem.deleteMany({
                where: { taskId: id },
            });

            // Delete the task itself (TaskTag will be deleted by cascade)
            // Note: Using tx directly since repository doesn't support transactions yet
            await tx.task.delete({
                where: { id: id },
            });
        }).then(async () => {
            // Publish domain event after transaction commits
            const taskId = TaskId.from(id);
            const boardIdVO = BoardId.from(boardId);
            await this.eventBus.publish(new TaskDeletedEvent(taskId, boardIdVO));
        });

        return { success: true };
    }
}
