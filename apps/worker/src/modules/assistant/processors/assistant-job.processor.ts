import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, type OnApplicationShutdown } from "@nestjs/common";
import { Job } from "bullmq";
import { AssistantOrchestrator } from "../services/assistant-orchestrator.service";
import { AssistantResultSenderService } from "../services/assistant-result-sender.service";
import type { AssistantRequest } from "../types/assistant.types";

/**
 * Job processor for assistant processing queue
 * Processes assistant requests and reports results via Redis queue
 *
 * Note: `concurrency` controls how many assistant jobs can run in parallel
 * within this worker process. Each job may issue multiple parallel LLM calls
 * according to the orchestrator DAG.
 */
@Processor({
  name: "assistant-processing",
  concurrency: 4,
})
export class AssistantJobProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(AssistantJobProcessor.name);

  constructor(
    private readonly orchestrator: AssistantOrchestrator,
    private readonly resultSenderService: AssistantResultSenderService,
  ) {
    super();
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Shutting down assistant job processor (signal: ${signal})`);
  }

  async process(job: Job<AssistantRequest>): Promise<void> {
    const { requestId, task } = job.data;

    // Validate job data
    if (!requestId || typeof requestId !== "string" || requestId.trim().length === 0) {
      throw new Error(
        "Invalid requestId in job data: requestId must be a non-empty string",
      );
    }

    if (!task || typeof task !== "string" || task.trim().length === 0) {
      throw new Error(
        "Invalid task in job data: task must be a non-empty string",
      );
    }

    this.logger.log(`Processing assistant job for request ${requestId}`);

    try {
      // Process request with orchestrator
      const result = await this.orchestrator.process(job.data, (progress) => {
        // Progress updates are handled internally, but we could publish them here if needed
        this.logger.debug(
          `Progress for ${requestId}: ${progress.stage} - ${progress.message}`,
        );
      });

      // Send result back via Redis queue
      await this.resultSenderService.sendResult(result);

      this.logger.log(`Completed assistant processing for request ${requestId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error processing assistant job for request ${requestId}: ${errorMessage}`,
      );
      throw error; // Re-throw to mark job as failed
    }
  }
}

