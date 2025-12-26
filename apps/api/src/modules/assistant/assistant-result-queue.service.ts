import type { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { AssistantResponse } from "./types";

@Injectable()
export class AssistantResultQueueService {
  private readonly logger = new Logger(AssistantResultQueueService.name);

  constructor(
    @InjectQueue("assistant-results")
    private readonly resultQueue: Queue<AssistantResponse>,
  ) {}

  /**
   * Add a job to the result queue (called by worker)
   * This is used internally - workers send results here
   */
  async addResult(data: AssistantResponse): Promise<void> {
    try {
      await this.resultQueue.add("assistant-result", data, {
        jobId: `assistant-result-${data.requestId}`,
        attempts: 1, // Results are idempotent
      });

      this.logger.log(`Queued assistant result for request ${data.requestId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to queue assistant result for request ${data.requestId}: ${errorMessage}`,
      );
      throw error;
    }
  }
}

