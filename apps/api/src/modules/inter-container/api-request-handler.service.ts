import type {
  ApiRequest,
  ApiResponse,
  CreateEmailActionTokenRequest,
  CreateEmailActionTokenResponse,
  GetColumnsRequest,
  GetColumnsResponse,
  GetTaskRequest,
  GetTaskResponse,
  GetTasksRequest,
  GetTasksResponse,
  GetUsersRequest,
  GetUsersResponse,
  MoveTasksRequest,
  MoveTasksResponse,
} from "@personal-kanban/shared";
import type { ColumnType } from "@prisma/client";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@personal-kanban/shared";
import { randomBytes } from "crypto";

/**
 * Handles requests from Worker container
 * All database access for worker requests goes through this service
 */
@Injectable()
export class ApiRequestHandlerService {
  private readonly logger = new Logger(ApiRequestHandlerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleRequest(request: ApiRequest): Promise<ApiResponse> {
    this.logger.debug(`Handling request: ${request.type}`);

    switch (request.type) {
      case "get-users":
        return this.handleGetUsers(request);
      case "get-tasks":
        return this.handleGetTasks(request);
      case "get-task":
        return this.handleGetTask(request);
      case "get-columns":
        return this.handleGetColumns(request);
      case "move-tasks":
        return this.handleMoveTasks(request);
      case "create-email-action-token":
        return this.handleCreateEmailActionToken(request);
      default:
        throw new Error(`Unknown request type: ${(request as any).type}`);
    }
  }

  private async handleGetUsers(
    request: GetUsersRequest,
  ): Promise<GetUsersResponse> {
    // Fetch all users (or with limit if specified)
    // We'll filter for valid emails in JavaScript since Prisma doesn't have a simple "not null" filter
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
      take: request.filters?.limit,
    });

    // Filter out users with invalid email addresses
    const validUsers = users.filter((user) => {
      const email = user.email?.trim();
      return email && email.length > 0 && email.includes("@");
    });

    return { users: validUsers };
  }

  private async handleGetTasks(
    request: GetTasksRequest,
  ): Promise<GetTasksResponse> {
    const where: any = {};

    if (request.filters.userId) {
      where.ownerId = request.filters.userId;
    }
    if (request.filters.boardId) {
      where.boardId = request.filters.boardId;
    }
    if (request.filters.columnId) {
      where.columnId = request.filters.columnId;
    }
    if (request.filters.columnType) {
      where.column = { type: request.filters.columnType as ColumnType };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        board: true,
        column: true,
      },
      take: request.filters.limit,
      orderBy: {
        updatedAt: "desc",
      },
    });

    return {
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        boardId: task.boardId,
        columnId: task.columnId,
        ownerId: task.ownerId,
        position: task.position,
        dueAt: task.dueAt,
        priority: task.priority ? String(task.priority) : null,
        duration: task.duration,
        boardName: task.board.name,
        columnName: task.column.name,
      })),
    };
  }

  private async handleGetTask(
    request: GetTaskRequest,
  ): Promise<GetTaskResponse> {
    const task = await this.prisma.task.findUnique({
      where: { id: request.taskId },
      select: {
        id: true,
        title: true,
        description: true,
        boardId: true,
        columnId: true,
        ownerId: true,
        position: true,
        metadata: true,
      },
    });

    return {
      task: task
        ? {
            id: task.id,
            title: task.title,
            description: task.description,
            boardId: task.boardId,
            columnId: task.columnId,
            ownerId: task.ownerId,
            position: task.position,
            metadata: (task.metadata as Record<string, unknown>) || null,
          }
        : null,
    };
  }

  private async handleGetColumns(
    request: GetColumnsRequest,
  ): Promise<GetColumnsResponse> {
    const where: any = { boardId: request.filters.boardId };
    if (request.filters.type) {
      where.type = request.filters.type as ColumnType;
    }

    const columns = await this.prisma.column.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        boardId: true,
        position: true,
      },
      orderBy: { position: "asc" },
    });

    return { columns };
  }

  private async handleMoveTasks(
    request: MoveTasksRequest,
  ): Promise<MoveTasksResponse> {
    // Find the target column
    const targetColumn = await this.prisma.column.findUnique({
      where: { id: request.targetColumnId },
    });

    if (!targetColumn) {
      throw new Error(`Column not found: ${request.targetColumnId}`);
    }

    // Get current max position in target column
    const maxPositionResult = await this.prisma.task.aggregate({
      where: { columnId: request.targetColumnId },
      _max: { position: true },
    });
    const maxPosition = maxPositionResult._max.position ?? -1;

    // Move all tasks to the target column
    await this.prisma.$transaction(
      request.taskIds.map((taskId, index) =>
        this.prisma.task.update({
          where: { id: taskId },
          data: {
            columnId: request.targetColumnId,
            position: maxPosition + 1 + index,
            lastMovedAt: new Date(),
          },
        }),
      ),
    );

    return { success: true, movedCount: request.taskIds.length };
  }

  private async handleCreateEmailActionToken(
    request: CreateEmailActionTokenRequest,
  ): Promise<CreateEmailActionTokenResponse> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.emailActionToken.create({
      data: {
        userId: request.userId,
        taskId: request.taskId,
        token,
        action: request.action,
        expiresAt,
      },
    });

    return { token };
  }
}
