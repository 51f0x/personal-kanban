import { Injectable, Logger } from "@nestjs/common";

import { BoardGateway } from "../realtime/board.gateway";
import { AgentProcessingProgress } from "./types";

/**
 * Agent Progress Service
 * Broadcasts agent processing progress to clients via WebSocket
 * Can be used by worker service to send real-time updates
 */
@Injectable()
export class AgentProgressService {
  private readonly logger = new Logger(AgentProgressService.name);

  constructor(private readonly boardGateway: BoardGateway) {}

  /**
   * Emit agent processing progress to board clients
   */
  emitAgentProgress(
    taskId: string,
    boardId: string,
    progress: AgentProcessingProgress,
  ): void {
    try {
      this.boardGateway.emitBoardUpdate(boardId, {
        type: "agent.progress",
        taskId,
        progress: {
          stage: progress.stage,
          progress: progress.progress,
          message: progress.message,
          details: progress.details,
          timestamp: progress.timestamp,
        },
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Emitted agent progress for task ${taskId}: ${progress.stage} (${progress.progress}%)`,
      );
    } catch (error) {
      this.logger.error(`Failed to emit agent progress: ${error}`);
    }
  }

  /**
   * Create a progress callback that can be passed to agent orchestrator
   */
  createProgressCallback(
    taskId: string,
    boardId: string,
  ): (progress: AgentProcessingProgress) => void {
    return (progress: AgentProcessingProgress) => {
      this.emitAgentProgress(taskId, boardId, progress);
    };
  }
}
