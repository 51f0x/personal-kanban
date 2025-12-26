import { Injectable, Logger } from "@nestjs/common";

import { BoardGateway } from "../realtime/board.gateway";
import type { AssistantProcessingProgress } from "./types";

/**
 * Assistant Progress Service
 * Broadcasts assistant processing progress to clients via WebSocket
 * Can be used by worker service to send real-time updates
 */
@Injectable()
export class AssistantProgressService {
  private readonly logger = new Logger(AssistantProgressService.name);

  constructor(private readonly boardGateway: BoardGateway) {}

  /**
   * Emit assistant processing progress to board clients
   */
  emitAssistantProgress(
    requestId: string,
    boardId: string,
    progress: AssistantProcessingProgress,
  ): void {
    try {
      this.boardGateway.emitBoardUpdate(boardId, {
        type: "assistant.progress",
        requestId,
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
        `Emitted assistant progress for request ${requestId}: ${progress.stage} (${progress.progress}%)`,
      );
    } catch (error) {
      this.logger.error(`Failed to emit assistant progress: ${error}`);
    }
  }

  /**
   * Create a progress callback that can be passed to assistant orchestrator
   */
  createProgressCallback(
    requestId: string,
    boardId: string,
  ): (progress: AssistantProcessingProgress) => void {
    return (progress: AssistantProcessingProgress) => {
      this.emitAssistantProgress(requestId, boardId, progress);
    };
  }
}

