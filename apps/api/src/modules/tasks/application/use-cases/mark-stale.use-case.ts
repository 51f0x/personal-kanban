import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import {
    ITaskRepository,
    IEventBus,
    Task,
    TaskId,
} from '@personal-kanban/shared';

/**
 * MarkStaleUseCase
 * Encapsulates the business logic for marking a task as stale
 */
@Injectable()
export class MarkStaleUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject('ITaskRepository') private readonly taskRepository: ITaskRepository,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
    ) {}

    async execute(id: string, isStale: boolean = true) {
        const taskId = TaskId.from(id);
        
        // Load task data from repository
        const taskData = await this.taskRepository.findById(taskId);
        if (!taskData) {
            throw new Error(`Task not found: ${id}`);
        }

        // Convert to Task entity
        const task = Task.fromPersistence(taskData);

        // Use entity's markStale method
        task.markStale(isStale);

        // Persist changes
        const updatedData = task.toPersistence();
        const updated = await this.taskRepository.update(taskId, updatedData);

        // Publish domain events from the entity
        const domainEvents = task.domainEvents;
        if (domainEvents.length > 0) {
            await this.eventBus.publishAll([...domainEvents]);
            task.clearDomainEvents();
        }

        return updated;
    }
}
