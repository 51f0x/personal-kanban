import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import { UpdateTaskDto } from '../../dto/update-task.input';
import {
    ITaskRepository,
    IEventBus,
    Task,
    TaskId,
} from '@personal-kanban/shared';

/**
 * UpdateTaskUseCase
 * Encapsulates the business logic for updating a task
 */
@Injectable()
export class UpdateTaskUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject('ITaskRepository') private readonly taskRepository: ITaskRepository,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
    ) {}

    async execute(id: string, input: UpdateTaskDto) {
        const { tags, columnId, projectId, metadata, ...rest } = input;
        const taskId = TaskId.from(id);

        // Load task data from repository
        const taskData = await this.taskRepository.findById(taskId);
        if (!taskData) {
            throw new Error(`Task not found: ${id}`);
        }

        // Convert to Task entity (ensure metadata is properly typed)
        const entityData = {
            ...taskData,
            metadata: taskData.metadata as Record<string, unknown> | null,
        };
        const task = Task.fromPersistence(entityData);

        // Use entity's update method
        task.update({
            ...rest,
            description: input.description,
            metadata: metadata === undefined 
                ? undefined 
                : metadata === null 
                    ? null 
                    : (typeof metadata === 'object' ? metadata as Record<string, unknown> : undefined),
            projectId: projectId === undefined ? undefined : projectId === null ? null : projectId,
            columnId: columnId,
        });

        // Persist changes
        const updatedData = task.toPersistence();
        const updated = await this.taskRepository.update(taskId, updatedData);

        // Handle tags separately (not in repository yet)
        if (tags !== undefined) {
            await this.prisma.$transaction(async (tx) => {
                await tx.taskTag.deleteMany({ where: { taskId: id } });
                if (tags.length) {
                    await tx.taskTag.createMany({
                        data: tags.map((tagId) => ({ taskId: id, tagId })),
                        skipDuplicates: true,
                    });
                }
            });
        }

        // Publish domain events from the entity
        const domainEvents = task.domainEvents;
        if (domainEvents.length > 0) {
            await this.eventBus.publishAll([...domainEvents]);
            task.clearDomainEvents();
        }

        return updated;
    }
}
