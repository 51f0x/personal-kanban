import type {
  BoardId,
  ColumnId,
  FindTasksOptions,
  ITaskRepository,
  TaskData,
  TaskWithRelations,
} from "@personal-kanban/shared";
import { Injectable } from "@nestjs/common";
import { PrismaService, TaskId } from "@personal-kanban/shared";

/**
 * Prisma implementation of ITaskRepository
 * Maps between domain value objects and Prisma operations
 */
@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: TaskId,
    options?: FindTasksOptions,
  ): Promise<TaskWithRelations | null> {
    const include: Record<string, boolean | object> = {};

    if (options?.includeColumn) {
      include.column = true;
    }
    if (options?.includeProject) {
      include.project = true;
    }
    if (options?.includeTags) {
      include.tags = { include: { tag: true } };
    }
    if (options?.includeChecklist) {
      include.checklist = { orderBy: { position: "asc" } };
    }
    if (options?.includeHints) {
      include.hints = {
        orderBy: [
          { applied: "asc" },
          { confidence: "desc" },
          { createdAt: "desc" },
        ],
      };
    }

    const task = await this.prisma.task.findUnique({
      where: { id: id.value },
      include: Object.keys(include).length > 0 ? include : undefined,
    });

    if (!task) {
      return null;
    }

    return this.mapToTaskData(task) as TaskWithRelations;
  }

  async findByBoardId(
    boardId: BoardId,
    options?: FindTasksOptions,
  ): Promise<TaskWithRelations[]> {
    const include: Record<string, boolean | object> = {};

    if (options?.includeColumn) {
      include.column = true;
    }
    if (options?.includeProject) {
      include.project = true;
    }
    if (options?.includeTags) {
      include.tags = { include: { tag: true } };
    }
    if (options?.includeHints) {
      include.hints = {
        orderBy: [
          { applied: "asc" },
          { confidence: "desc" },
          { createdAt: "desc" },
        ],
      };
    }

    const tasks = await this.prisma.task.findMany({
      where: { boardId: boardId.value },
      include: Object.keys(include).length > 0 ? include : undefined,
      orderBy: [
        { columnId: "asc" },
        { position: "asc" },
        { lastMovedAt: "asc" },
      ],
    });

    return tasks.map((task) => this.mapToTaskData(task) as TaskWithRelations);
  }

  async findByColumnId(
    columnId: ColumnId,
    options?: FindTasksOptions,
  ): Promise<TaskWithRelations[]> {
    const include: Record<string, boolean | object> = {};

    if (options?.includeProject) {
      include.project = true;
    }
    if (options?.includeTags) {
      include.tags = { include: { tag: true } };
    }

    const tasks = await this.prisma.task.findMany({
      where: { columnId: columnId.value },
      include: Object.keys(include).length > 0 ? include : undefined,
      orderBy: [{ position: "asc" }, { lastMovedAt: "asc" }],
    });

    return tasks.map((task) => this.mapToTaskData(task) as TaskWithRelations);
  }

  async findByIds(ids: TaskId[]): Promise<TaskData[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        id: { in: ids.map((id) => id.value) },
      },
    });

    return tasks.map((task) => this.mapToTaskData(task));
  }

  async save(task: TaskData): Promise<TaskData> {
    if (await this.exists(TaskId.from(task.id))) {
      return this.update(TaskId.from(task.id), task);
    }
    return this.create(task);
  }

  async create(
    task: Omit<TaskData, "id" | "createdAt" | "updatedAt" | "lastMovedAt">,
  ): Promise<TaskData> {
    const created = await this.prisma.task.create({
      data: {
        boardId: task.boardId,
        columnId: task.columnId,
        ownerId: task.ownerId,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        context: task.context as any,
        waitingFor: task.waitingFor,
        dueAt: task.dueAt,
        priority: task.priority as any,
        duration: task.duration,
        needsBreakdown: task.needsBreakdown,
        metadata: task.metadata as any,
        isDone: task.isDone,
        position: task.position,
        stale: task.stale,
      },
    });

    return this.mapToTaskData(created);
  }

  async update(id: TaskId, data: Partial<TaskData>): Promise<TaskData> {
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.context !== undefined) updateData.context = data.context as any;
    if (data.waitingFor !== undefined) updateData.waitingFor = data.waitingFor;
    if (data.dueAt !== undefined) updateData.dueAt = data.dueAt;
    if (data.priority !== undefined) updateData.priority = data.priority as any;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.needsBreakdown !== undefined)
      updateData.needsBreakdown = data.needsBreakdown;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as any;
    if (data.isDone !== undefined) updateData.isDone = data.isDone;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.columnId !== undefined) updateData.columnId = data.columnId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.stale !== undefined) updateData.stale = data.stale;
    if (data.completedAt !== undefined)
      updateData.completedAt = data.completedAt;
    if (data.lastMovedAt !== undefined)
      updateData.lastMovedAt = data.lastMovedAt;

    const updated = await this.prisma.task.update({
      where: { id: id.value },
      data: updateData,
    });

    return this.mapToTaskData(updated);
  }

  async delete(id: TaskId): Promise<void> {
    await this.prisma.task.delete({
      where: { id: id.value },
    });
  }

  async exists(id: TaskId): Promise<boolean> {
    const count = await this.prisma.task.count({
      where: { id: id.value },
    });
    return count > 0;
  }

  async countByColumnId(
    columnId: ColumnId,
    excludeTaskId?: TaskId,
  ): Promise<number> {
    return this.prisma.task.count({
      where: {
        columnId: columnId.value,
        ...(excludeTaskId ? { id: { not: excludeTaskId.value } } : {}),
      },
    });
  }

  async getMaxPositionInColumn(columnId: ColumnId): Promise<number> {
    const result = await this.prisma.task.aggregate({
      where: { columnId: columnId.value },
      _max: { position: true },
    });

    return result._max.position ?? -1;
  }

  async findStaleTasks(thresholdDays: number): Promise<TaskData[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    const tasks = await this.prisma.task.findMany({
      where: {
        stale: false,
        isDone: false,
        lastMovedAt: { lt: thresholdDate },
      },
    });

    return tasks.map((task) => this.mapToTaskData(task));
  }

  async updatePositions(
    updates: Array<{ id: TaskId; position: number }>,
  ): Promise<void> {
    // Use a transaction to update all positions atomically
    await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.task.update({
          where: { id: update.id.value },
          data: { position: update.position },
        }),
      ),
    );
  }

  /**
   * Map Prisma task to TaskData
   */
  private mapToTaskData(task: any): TaskData {
    return {
      id: task.id,
      boardId: task.boardId,
      columnId: task.columnId,
      projectId: task.projectId,
      ownerId: task.ownerId,
      title: task.title,
      description: task.description,
      context: task.context,
      waitingFor: task.waitingFor,
      dueAt: task.dueAt,
      priority: task.priority,
      duration: task.duration,
      needsBreakdown: task.needsBreakdown,
      metadata: task.metadata as Record<string, unknown> | null,
      isDone: task.isDone,
      position: task.position,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
      lastMovedAt: task.lastMovedAt,
      stale: task.stale,
    };
  }
}
