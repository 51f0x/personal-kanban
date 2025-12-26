import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@personal-kanban/shared";
import { Injectable, Logger } from "@nestjs/common";

import { AgentProgressService } from "./agent-progress.service";
import { AgentQueueService } from "./agent-queue.service";
import { AgentProcessingProgress } from "./types";

/**
 * Agent Capture Service
 * Processes captured tasks with agents and broadcasts progress via WebSocket.
 *
 * This lives in the agents module to keep the capture feature decoupled:
 * - Capture is responsible only for creating tasks from incoming content
 * - Agents are responsible for background processing and progress reporting
 */
@Injectable()
export class AgentCaptureService {
  private readonly logger = new Logger(AgentCaptureService.name);
  private readonly workerUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentProgressService: AgentProgressService,
    private readonly agentQueueService: AgentQueueService,
    private readonly config: ConfigService,
  ) {
    // Get worker URL from config (for future HTTP-based agent processing)
    this.workerUrl = this.config.get<string>(
      "WORKER_URL",
      "http://localhost:3001",
    );
  }

  /**
   * Process a captured task with agents asynchronously.
   * This runs in the background and broadcasts progress via WebSocket.
   */
  async processTaskWithAgentsAsync(
    taskId: string,
    boardId: string,
  ): Promise<void> {
    // Run processing in background (don't await - fire and forget)
    this.processTaskWithAgents(taskId, boardId).catch((error) => {
      this.logger.error(
        `Error processing task ${taskId} with agents: ${error}`,
      );
    });
  }

  /**
   * Process task with agents and broadcast progress via WebSocket.
   *
   * This method:
   * 1. Creates a progress callback that broadcasts via WebSocket
   * 2. Checks if the task has a URL
   * 3. Triggers agent processing (currently via BullMQ queue)
   * 4. Broadcasts all progress updates to connected clients
   */
  private async processTaskWithAgents(
    taskId: string,
    boardId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Starting agent processing for captured task ${taskId}`);

      // Create progress callback that broadcasts via WebSocket
      const onProgress = this.agentProgressService.createProgressCallback(
        taskId,
        boardId,
      );

      // Emit initial progress
      await this.emitProgress(onProgress, {
        taskId,
        stage: "initializing",
        progress: 0,
        message: "Starting agent processing...",
      });

      // Fetch task to check for URL
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          title: true,
          description: true,
          metadata: true,
          boardId: true,
        },
      });

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      await this.emitProgress(onProgress, {
        taskId,
        stage: "detecting-url",
        progress: 10,
        message: "Detecting URLs in task...",
      });

      // Check for URL in metadata or text
      const metadata = (task.metadata || {}) as Record<string, unknown>;
      const url = metadata.url as string | undefined;
      const text = `${task.title} ${task.description || ""}`;
      const urlRegex = /(https?:\/\/[^\s]+)/i;
      const urlMatch = text.match(urlRegex);
      const detectedUrl = url || urlMatch?.[0];

      if (detectedUrl) {
        // URL detected - trigger full agent processing
        await this.processTaskWithUrl(task, detectedUrl, onProgress);
      } else {
        // No URL - task captured successfully
        await this.emitProgress(onProgress, {
          taskId,
          stage: "completed",
          progress: 100,
          message: "Task captured successfully (no URL detected)",
        });
      }

      this.logger.log(
        `Agent processing notification completed for task ${taskId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error in agent processing for task ${taskId}: ${errorMessage}`,
      );

      // Emit error progress
      this.agentProgressService.emitAgentProgress(taskId, boardId, {
        taskId,
        stage: "error",
        progress: 0,
        message: `Processing error: ${errorMessage}`,
        details: { error: errorMessage },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Process task that contains a URL.
   * Queues a BullMQ job for the worker to process with agents.
   */
  private async processTaskWithUrl(
    task: {
      id: string;
      title: string;
      description: string | null;
      boardId: string;
    },
    url: string,
    onProgress: (progress: AgentProcessingProgress) => void,
  ): Promise<void> {
    try {
      // Emit initial progress
      await this.emitProgress(onProgress, {
        taskId: task.id,
        stage: "initializing",
        progress: 5,
        message: "Queuing agent processing job...",
        details: { url },
      });

      // Queue the job for worker to process
      // Progress updates are now sent via domain events instead of HTTP callbacks
      // Send full task data - worker does not query database
      const taskMetadata = (task.metadata || {}) as Record<string, unknown>;
      await this.agentQueueService.queueAgentProcessing(
        task.id,
        task.boardId,
        task.title,
        task.description,
        taskMetadata,
      );

      // Emit queued progress
      await this.emitProgress(onProgress, {
        taskId: task.id,
        stage: "initializing",
        progress: 10,
        message:
          "Agent processing queued - worker will process task and create hints",
        details: { url },
      });

      this.logger.log(`Queued agent processing job for task ${task.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to queue agent processing for task ${task.id}: ${errorMessage}`,
      );

      await this.emitProgress(onProgress, {
        taskId: task.id,
        stage: "error",
        progress: 0,
        message: `Failed to queue agent processing: ${errorMessage}`,
        details: { url, error: errorMessage },
      });

      throw error;
    }
  }

  /**
   * Helper to emit progress update.
   */
  private async emitProgress(
    onProgress: (progress: AgentProcessingProgress) => void,
    update: Partial<AgentProcessingProgress> & { taskId?: string },
  ): Promise<void> {
    onProgress({
      taskId: update.taskId || "",
      stage: "initializing",
      progress: 0,
      message: "",
      timestamp: new Date().toISOString(),
      ...update,
    });
  }
}


