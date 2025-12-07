import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import {
    ITaskRepository,
    IEventBus,
    TaskId,
    BoardId,
    TaskDeletedEvent,
} from '@personal-kanban/shared';

/**
 * DeleteTaskUseCase
 * Encapsulates the business logic for deleting a task
 */
@Injectable()
export class DeleteTaskUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject('ITaskRepository') private readonly taskRepository: ITaskRepository,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
    ) {}

    async execute(id: string) {
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
            const taskIdVO = TaskId.from(id);
            const boardIdVO = BoardId.from(boardId);
            await this.eventBus.publish(new TaskDeletedEvent(taskIdVO, boardIdVO));
        });

        return { success: true };
    }
}
