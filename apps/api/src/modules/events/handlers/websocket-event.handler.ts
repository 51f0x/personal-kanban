import { Injectable, Logger } from "@nestjs/common";
import {
  AgentCompletedEvent,
  AgentProgressEvent,
  BoardUpdatedEvent,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskMovedEvent,
  TaskStaleEvent,
  TaskUpdatedEvent,
} from "@personal-kanban/shared";

import { BoardGateway } from "../../realtime/board.gateway";

/**
 * WebSocket Event Handler
 * Broadcasts domain events to connected WebSocket clients
 */
@Injectable()
export class WebSocketEventHandler {
  private readonly logger = new Logger(WebSocketEventHandler.name);

  constructor(private readonly boardGateway: BoardGateway) {}

  async handleTaskCreated(event: TaskCreatedEvent): Promise<void> {
    this.boardGateway.emitBoardUpdate(event.boardId.value, {
      type: "task.created",
      taskId: event.taskId.value,
      timestamp: event.occurredOn.toISOString(),
    });
  }

  async handleTaskMoved(event: TaskMovedEvent): Promise<void> {
    this.boardGateway.emitBoardUpdate(event.boardId.value, {
      type: "task.moved",
      taskId: event.taskId.value,
      fromColumnId: event.fromColumnId?.value || null,
      toColumnId: event.toColumnId.value,
      timestamp: event.occurredOn.toISOString(),
    });
  }

  async handleTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
    this.boardGateway.emitBoardUpdate(event.boardId.value, {
      type: "task.updated",
      taskId: event.taskId.value,
      changes: event.changes,
      timestamp: event.occurredOn.toISOString(),
    });
  }

  async handleTaskDeleted(event: TaskDeletedEvent): Promise<void> {
    this.boardGateway.emitBoardUpdate(event.boardId.value, {
      type: "task.deleted",
      taskId: event.taskId.value,
      timestamp: event.occurredOn.toISOString(),
    });
  }

  async handleTaskStale(event: TaskStaleEvent): Promise<void> {
    this.boardGateway.emitBoardUpdate(event.boardId.value, {
      type: "task.stale",
      taskId: event.taskId.value,
      isStale: event.isStale,
      timestamp: event.occurredOn.toISOString(),
    });
  }

  async handleBoardUpdated(event: BoardUpdatedEvent): Promise<void> {
    this.boardGateway.emitBoardUpdate(event.boardId.value, {
      type: "board.updated",
      boardId: event.boardId.value,
      changes: event.changes,
      timestamp: event.occurredOn.toISOString(),
    });
  }

  async handleAgentProgress(event: AgentProgressEvent): Promise<void> {
    this.boardGateway.emitBoardUpdate(event.boardId.value, {
      type: "agent.progress",
      taskId: event.taskId.value,
      progress: {
        stage: event.stage,
        progress: event.progress,
        message: event.message,
        details: event.details,
        timestamp: event.occurredOn.toISOString(),
      },
      timestamp: event.occurredOn.toISOString(),
    });
  }

  async handleAgentCompleted(event: AgentCompletedEvent): Promise<void> {
    this.boardGateway.emitBoardUpdate(event.boardId.value, {
      type: "agent.completed",
      taskId: event.taskId.value,
      processingTimeMs: event.processingTimeMs,
      successfulAgents: event.successfulAgents,
      errors: event.errors,
      timestamp: event.occurredOn.toISOString(),
    });
  }
}
