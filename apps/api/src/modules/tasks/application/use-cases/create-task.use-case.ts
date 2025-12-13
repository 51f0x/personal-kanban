import { PrismaService } from "@personal-kanban/shared";
import { Inject, Injectable } from "@nestjs/common";
import {
  BoardId,
  ColumnId,
  IEventBus,
  ITaskRepository,
  Task,
} from "@personal-kanban/shared";
import { Prisma, TaskContext } from "@prisma/client";

import { AgentQueueService } from "../../../agents/agent-queue.service";
import { CreateTaskDto } from "../../dto/create-task.input";

/**
 * CreateTaskUseCase
 * Encapsulates the business logic for creating a new task
 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("ITaskRepository") private readonly taskRepository: ITaskRepository,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
    private readonly agentQueueService: AgentQueueService,
  ) {}

  async execute(input: CreateTaskDto) {
    // Task creation is immediate - LLM analysis happens asynchronously in worker
    // Use explicit input values only
    const context = input.context ?? null;
    const waitingFor = input.waitingFor ?? null;
    const dueAt = input.dueAt ?? null;
    const needsBreakdown = input.needsBreakdown ?? false;

    // Build metadata object from input only
    const metadata: Record<string, unknown> = {
      ...(input.metadata && typeof input.metadata === "object"
        ? input.metadata
        : {}),
    };

    // Get the max position in the target column to place new task at the end
    const columnId = ColumnId.from(input.columnId);
    const boardId = BoardId.from(input.boardId);
    const newPosition =
      (await this.taskRepository.getMaxPositionInColumn(columnId)) + 1;

    // Create Task entity using factory method
    const task = Task.create(
      boardId,
      columnId,
      input.ownerId,
      input.title,
      input.description ?? null,
      newPosition,
      {
        projectId: input.projectId ?? null,
        context: context as any, // TaskContext type from Prisma
        waitingFor,
        dueAt,
        needsBreakdown,
        metadata,
      },
    );

    // Persist task and related data
    const taskData = task.toPersistence();
    const persistedTask = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          id: taskData.id,
          boardId: taskData.boardId,
          columnId: taskData.columnId,
          ownerId: taskData.ownerId,
          projectId: taskData.projectId,
          title: taskData.title,
          description: taskData.description,
          context: taskData.context as TaskContext | null,
          waitingFor: taskData.waitingFor,
          dueAt: taskData.dueAt,
          needsBreakdown: taskData.needsBreakdown,
          position: taskData.position,
          metadata:
            Object.keys(taskData.metadata || {}).length > 0
              ? (taskData.metadata as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          isDone: taskData.isDone,
          stale: taskData.stale,
          createdAt: taskData.createdAt,
          updatedAt: taskData.updatedAt,
          completedAt: taskData.completedAt,
          lastMovedAt: taskData.lastMovedAt,
        },
      });

      if (input.tags?.length) {
        await tx.taskTag.createMany({
          data: input.tags.map((tagId) => ({ taskId: created.id, tagId })),
          skipDuplicates: true,
        });
      }

      if (input.checklist?.length) {
        await tx.checklistItem.createMany({
          data: input.checklist.map((item, index) => ({
            taskId: created.id,
            title: item.title,
            isDone: item.isDone ?? false,
            position: item.position ?? index,
          })),
        });
      }

      return created;
    });

    // Publish domain events from the entity
    const domainEvents = task.domainEvents;
    if (domainEvents.length > 0) {
      await this.eventBus.publishAll([...domainEvents]);
      task.clearDomainEvents();
    }

    // Queue task for asynchronous agent processing
    // This happens in the background - task creation is immediate
    this.agentQueueService
      .queueAgentProcessing(persistedTask.id, persistedTask.boardId)
      .catch((error) => {
        // Log but don't fail task creation if queuing fails
        console.error(
          `Failed to queue agent processing for task ${persistedTask.id}:`,
          error,
        );
      });

    return persistedTask;
  }
}
