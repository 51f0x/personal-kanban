import type { Job } from "bullmq";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";

import type { AssistantResponse } from "./types";

/**
 * Job processor for assistant result queue
 * Receives results from worker after assistant processing
 */
@Processor("assistant-results")
export class AssistantResultProcessor extends WorkerHost {
  private readonly logger = new Logger(AssistantResultProcessor.name);

  async process(job: Job<AssistantResponse>): Promise<void> {
    const { requestId, success, result, processingTimeMs, errors } = job.data;

    this.logger.log(
      `Processing assistant result for request ${requestId} (${processingTimeMs}ms)`,
    );

    try {
      // Results can be used for:
      // - Notifications
      // - Analytics
      // - WebSocket updates
      // - Additional processing if needed

      this.logger.log(
        `Assistant processing completed for request ${requestId}: ` +
          `success: ${success}, ` +
          `todoList items: ${result?.todoList?.length || 0}, ` +
          `errors: ${errors?.length || 0}`,
      );

      // TODO: Add any additional processing here:
      // - Send WebSocket notification to clients
      // - Update analytics
      // - Trigger follow-up actions
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error processing assistant result for request ${requestId}: ${errorMessage}`,
      );
      // Don't throw - result processing failure shouldn't fail the job
    }
  }
}

