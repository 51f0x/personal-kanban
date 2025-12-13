import type { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";

export interface AgentProcessingJobData {
  taskId: string;
  boardId?: string; // Optional, can be extracted from task if needed
  progressCallbackUrl?: string; // Deprecated - kept for backward compatibility, events are used instead
}

@Injectable()
export class AgentQueueService {
  private readonly logger = new Logger(AgentQueueService.name);

  constructor(
    @InjectQueue("agent-processing")
    private readonly agentQueue: Queue<AgentProcessingJobData>,
  ) {}

  /**
   * Queue a task for agent processing
   * Progress updates are now sent via domain events instead of HTTP callbacks
   */
  async queueAgentProcessing(taskId: string, boardId?: string): Promise<void> {
    try {
      await this.agentQueue.add(
        "process-task",
        {
          taskId,
          boardId,
        },
        {
          jobId: `agent-processing-${taskId}`, // Unique job ID to prevent duplicates
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );

      this.logger.log(`Queued agent processing job for task ${taskId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to queue agent processing for task ${taskId}: ${errorMessage}`,
      );
      throw error;
    }
  }
}
