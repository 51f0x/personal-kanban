import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import type {
  AssistantProcessingResult,
  AssistantResponse,
} from "../types/assistant.types";

/**
 * Service to send assistant processing results back via Redis queue
 */
@Injectable()
export class AssistantResultSenderService {
  private readonly logger = new Logger(AssistantResultSenderService.name);

  constructor(
    @InjectQueue("assistant-results")
    private readonly resultQueue: Queue<AssistantResponse>,
  ) {}

  /**
   * Send assistant processing result back via queue
   */
  async sendResult(processingResult: AssistantProcessingResult): Promise<void> {
    try {
      const response: AssistantResponse = {
        requestId: processingResult.requestId,
        success: !!processingResult.finalAssembler?.success,
        result: processingResult.finalAssembler?.result,
        error: processingResult.errors?.join("; "),
        processingTimeMs: processingResult.processingTimeMs,
        errors: processingResult.errors,
        progress: processingResult.progress,
      };

      await this.resultQueue.add("assistant-result", response, {
        jobId: `assistant-result-${processingResult.requestId}`,
        attempts: 1, // Results are idempotent
      });

      this.logger.log(
        `Sent assistant result to queue for request ${processingResult.requestId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to send assistant result to queue for request ${processingResult.requestId}: ${errorMessage}`,
      );
      // Don't throw - result sending failure shouldn't fail the processing
    }
  }
}

