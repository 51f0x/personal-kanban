import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import { TaskEventType, Prisma } from '@prisma/client';
import {
    TaskCreatedEvent,
    TaskMovedEvent,
    TaskUpdatedEvent,
    TaskDeletedEvent,
    TaskStaleEvent,
} from '@personal-kanban/shared';

/**
 * TaskEvent Persistence Handler
 * Persists domain events to the TaskEvent table for analytics and rules
 */
@Injectable()
export class TaskEventPersistenceHandler {
    private readonly logger = new Logger(TaskEventPersistenceHandler.name);

    constructor(private readonly prisma: PrismaService) {}

    async handleTaskCreated(event: TaskCreatedEvent): Promise<void> {
        try {
            await this.prisma.taskEvent.create({
                data: {
                    taskId: event.taskId.value,
                    boardId: event.boardId.value,
                    type: TaskEventType.CREATED,
                    toColumnId: event.columnId.value,
                },
            });
        } catch (error) {
            this.logger.error('Failed to persist TaskCreatedEvent:', error);
        }
    }

    async handleTaskMoved(event: TaskMovedEvent): Promise<void> {
        try {
            await this.prisma.taskEvent.create({
                data: {
                    taskId: event.taskId.value,
                    boardId: event.boardId.value,
                    type: TaskEventType.MOVED,
                    fromColumnId: event.fromColumnId?.value || null,
                    toColumnId: event.toColumnId.value,
                    payload: {
                        position: event.position,
                        wipOverride: event.wipOverride,
                    },
                },
            });
        } catch (error) {
            this.logger.error('Failed to persist TaskMovedEvent:', error);
        }
    }

    async handleTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
        try {
            await this.prisma.taskEvent.create({
                data: {
                    taskId: event.taskId.value,
                    boardId: event.boardId.value,
                    type: TaskEventType.UPDATED,
                    payload: event.changes as Prisma.InputJsonValue,
                },
            });
        } catch (error) {
            this.logger.error('Failed to persist TaskUpdatedEvent:', error);
        }
    }

    async handleTaskDeleted(event: TaskDeletedEvent): Promise<void> {
        try {
            // Note: TaskEvent deletion is handled by cascade in Prisma
            // This handler can be used for logging or analytics
            this.logger.debug(`Task deleted: ${event.taskId.value}`);
        } catch (error) {
            this.logger.error('Failed to handle TaskDeletedEvent:', error);
        }
    }

    async handleTaskStale(event: TaskStaleEvent): Promise<void> {
        try {
            await this.prisma.taskEvent.create({
                data: {
                    taskId: event.taskId.value,
                    boardId: event.boardId.value,
                    type: TaskEventType.STALE,
                    payload: {
                        isStale: event.isStale,
                    },
                },
            });
        } catch (error) {
            this.logger.error('Failed to persist TaskStaleEvent:', error);
        }
    }
}
