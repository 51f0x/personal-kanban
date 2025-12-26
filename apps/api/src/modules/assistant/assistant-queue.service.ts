import type { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { AssistantRequest } from "./types";

@Injectable()
export class AssistantQueueService {
  private readonly logger = new Logger(AssistantQueueService.name);

  constructor(
    @InjectQueue("assistant-processing")
    private readonly assistantQueue: Queue<AssistantRequest>,
  ) {}

  /**
   * Queue a task for assistant processing
   * Progress updates are sent via domain events
   */
  async queueAssistantProcessing(
    requestId: string,
    task: string,
    projectId?: string,
    context?: AssistantRequest["context"],
    constraints?: AssistantRequest["constraints"],
    deliverables?: AssistantRequest["deliverables"],
  ): Promise<void> {
    try {
      await this.assistantQueue.add(
        "process-assistant",
        {
          requestId,
          task,
          projectId,
          context,
          constraints,
          deliverables,
        },
        {
          jobId: `assistant-processing-${requestId}`, // Unique job ID to prevent duplicates
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );

      this.logger.log(`Queued assistant processing job for request ${requestId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to queue assistant processing for request ${requestId}: ${errorMessage}`,
      );
      throw error;
    }
  }
}

