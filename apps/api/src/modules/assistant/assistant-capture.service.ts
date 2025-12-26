import { PrismaService } from "@personal-kanban/shared";
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";

import { AssistantProgressService } from "./assistant-progress.service";
import { AssistantQueueService } from "./assistant-queue.service";
import type { AssistantProcessingProgress } from "./types";

/**
 * Assistant Capture Service
 * Processes captured tasks with assistant and broadcasts progress via WebSocket.
 *
 * This lives in the assistant module to keep the capture feature decoupled:
 * - Capture is responsible only for creating tasks from incoming content
 * - Assistant is responsible for background processing and progress reporting
 */
@Injectable()
export class AssistantCaptureService {
  private readonly logger = new Logger(AssistantCaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assistantProgressService: AssistantProgressService,
    private readonly assistantQueueService: AssistantQueueService,
  ) {}

  /**
   * Process a captured task with assistant asynchronously.
   * This runs in the background and broadcasts progress via WebSocket.
   */
  async processTaskWithAssistantAsync(
    taskId: string,
    boardId: string,
  ): Promise<void> {
    // Run processing in background (don't await - fire and forget)
    this.processTaskWithAssistant(taskId, boardId).catch((error) => {
      this.logger.error(
        `Error processing task ${taskId} with assistant: ${error}`,
      );
    });
  }

  /**
   * Process task with assistant and broadcast progress via WebSocket.
   *
   * This method:
   * 1. Creates a progress callback that broadcasts via WebSocket
   * 2. Extracts task information
   * 3. Triggers assistant processing (currently via BullMQ queue)
   * 4. Broadcasts all progress updates to connected clients
   */
  private async processTaskWithAssistant(
    taskId: string,
    boardId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Starting assistant processing for captured task ${taskId}`,
      );

      // Fetch task (including projectId)
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          title: true,
          description: true,
          metadata: true,
          boardId: true,
          projectId: true,
        },
      });

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Create request ID
      const requestId = `${taskId}-${randomUUID()}`;

      // Create progress callback that broadcasts via WebSocket
      const onProgress = this.assistantProgressService.createProgressCallback(
        requestId,
        boardId,
      );

      // Emit initial progress
      await this.emitProgress(onProgress, {
        requestId,
        stage: "analysis",
        progress: 0,
        message: "Starting assistant processing...",
      });

      // Build task description
      const taskDescription = [task.title, task.description]
        .filter(Boolean)
        .join("\n\n");

      // Queue the job for worker to process
      // Include projectId if task is assigned to a project (to use project's local brain)
      await this.assistantQueueService.queueAssistantProcessing(
        requestId,
        taskDescription,
        task.projectId || undefined, // projectId - use project's local brain if task has one
        undefined, // context - can be extracted from metadata if needed
        undefined, // constraints - can be extracted from metadata if needed
        undefined, // deliverables - can be extracted from metadata if needed
      );

      // Emit queued progress
      await this.emitProgress(onProgress, {
        requestId,
        stage: "analysis",
        progress: 10,
        message: "Assistant processing queued - worker will process task",
      });

      this.logger.log(
        `Queued assistant processing job for task ${task.id} (request ${requestId})`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error in assistant processing for task ${taskId}: ${errorMessage}`,
      );

      // Emit error progress
      const errorRequestId = `${taskId}-error`;
      this.assistantProgressService.emitAssistantProgress(
        errorRequestId,
        boardId,
        {
          requestId: errorRequestId,
          stage: "error",
          progress: 0,
          message: `Processing error: ${errorMessage}`,
          details: { error: errorMessage },
          timestamp: new Date().toISOString(),
        },
      );
    }
  }

  /**
   * Helper to emit progress update.
   */
  private async emitProgress(
    onProgress: (progress: AssistantProcessingProgress) => void,
    update: Partial<AssistantProcessingProgress> & { requestId?: string },
  ): Promise<void> {
    onProgress({
      requestId: update.requestId || "",
      stage: "analysis",
      progress: 0,
      message: "",
      timestamp: new Date().toISOString(),
      ...update,
    });
  }
}
