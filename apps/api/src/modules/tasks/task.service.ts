import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskEventType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BoardGateway } from '../realtime/board.gateway';
import { WipService } from '../boards/wip.service';
import { LlmService } from '../llm/llm.service';
import { CreateTaskDto } from './dto/create-task.input';
import { UpdateTaskDto } from './dto/update-task.input';
import { MoveTaskDto, MoveTaskResult } from './dto/move-task.input';

@Injectable()
export class TaskService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly boardGateway: BoardGateway,
        private readonly wipService: WipService,
        private readonly llmService: LlmService,
    ) {}

    async createTask(input: CreateTaskDto) {
        // Analyze task with LLM if title/description provided
        let llmAnalysis = null;
        if (input.title) {
            try {
                llmAnalysis = await this.llmService.analyzeTask(input.title, input.description);
            } catch (error) {
                // Log but don't fail task creation if LLM fails
                // LLM analysis is optional, so we continue without it
            }
        }

        // Merge LLM analysis with input, giving priority to explicit input values
        const context = input.context ?? llmAnalysis?.context ?? null;
        const waitingFor = input.waitingFor ?? llmAnalysis?.waitingFor ?? null;

        // Parse dueAt from LLM analysis, handling invalid dates gracefully
        let dueAt = input.dueAt;
        if (!dueAt && llmAnalysis?.dueAt) {
            try {
                const parsedDate = new Date(llmAnalysis.dueAt);
                if (!Number.isNaN(parsedDate.getTime())) {
                    dueAt = parsedDate;
                }
            } catch {
                // Invalid date, ignore
            }
        }

        const needsBreakdown = input.needsBreakdown ?? llmAnalysis?.needsBreakdown ?? false;

        // Build metadata object
        const metadata: Record<string, unknown> = {
            ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
            ...(llmAnalysis
                ? {
                      llmAnalysis: {
                          priority: llmAnalysis.priority,
                          estimatedDuration: llmAnalysis.estimatedDuration,
                          suggestedTags: llmAnalysis.suggestedTags,
                          confidence: llmAnalysis.confidence,
                          analyzedAt: new Date().toISOString(),
                      },
                  }
                : {}),
        };

        return this.prisma.$transaction(async (tx) => {
            // Get the max position in the target column to place new task at the end
            const maxPositionResult = await tx.task.aggregate({
                where: { columnId: input.columnId },
                _max: { position: true },
            });
            const newPosition = (maxPositionResult._max.position ?? -1) + 1;

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

            await tx.taskEvent.create({
                data: {
                    taskId: task.id,
                    boardId: task.boardId,
                    type: TaskEventType.CREATED,
                    toColumnId: task.columnId,
                },
            });

            this.boardGateway.emitBoardUpdate(task.boardId, {
                type: 'task.created',
                taskId: task.id,
            });
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

            this.boardGateway.emitBoardUpdate(task.boardId, {
                type: 'task.updated',
                taskId: task.id,
            });
            return task;
        });
    }

    getTaskById(id: string) {
        return this.prisma.task.findUnique({
            where: { id },
            include: {
                checklist: { orderBy: { position: 'asc' } },
                tags: { include: { tag: true } },
                hints: {
                    orderBy: [
                        { applied: 'asc' }, // Unapplied hints first
                        { confidence: 'desc' }, // Higher confidence first
                        { createdAt: 'desc' }, // Newer first
                    ],
                },
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
                hints: {
                    orderBy: [
                        { applied: 'asc' }, // Unapplied hints first
                        { confidence: 'desc' }, // Higher confidence first
                        { createdAt: 'desc' }, // Newer first
                    ],
                },
            },
            orderBy: [
                { columnId: 'asc' },
                { position: 'asc' },
                { lastMovedAt: 'asc' }, // Fallback for tasks with same position
            ],
        });
    }

    /**
     * Move a task to a different column with WIP limit validation
     * Also handles reordering tasks within the same column
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
            // Get current max position in target column to determine new position
            const maxPositionResult = await tx.task.aggregate({
                where: { columnId: input.columnId },
                _max: { position: true },
            });
            const maxPosition = maxPositionResult._max.position ?? -1;

            // If position is provided, use it (and reorder other tasks)
            // Otherwise, place at the end
            const targetPosition = input.position !== undefined ? input.position : maxPosition + 1;

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
                        position: targetPosition,
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
     * Delete a task and all related records
     */
    async deleteTask(id: string) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            select: { boardId: true },
        });

        if (!task) {
            throw new NotFoundException(`Task not found: ${id}`);
        }

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
            await tx.task.delete({
                where: { id },
            });
        });

        this.boardGateway.emitBoardUpdate(task.boardId, {
            type: 'task.deleted',
            taskId: id,
            timestamp: new Date().toISOString(),
        });

        return { success: true };
    }
}
