import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import type { AgentProcessingResult } from "../types/types";

export interface AgentResultJobData {
  taskId: string;
  boardId: string;
  results: {
    taskAnalysis?: {
      success: boolean;
      confidence: number;
      context?: string;
      suggestedTags?: string[];
      priority?: string;
      estimatedDuration?: string;
    };
    contextExtraction?: {
      success: boolean;
      confidence: number;
      tags?: string[];
    };
    actionExtraction?: {
      success: boolean;
      confidence: number;
      actionsCount?: number;
    };
    errors?: string[];
  };
  processingTimeMs: number;
}

/**
 * Service to send agent processing results back to API via queue
 */
@Injectable()
export class AgentResultSenderService {
  private readonly logger = new Logger(AgentResultSenderService.name);

  constructor(
    @InjectQueue("agent-results")
    private readonly resultQueue: Queue<AgentResultJobData>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send agent processing results back to API
   */
  async sendResult(
    taskId: string,
    boardId: string,
    processingResult: AgentProcessingResult,
  ): Promise<void> {
    try {
      const resultData: AgentResultJobData = {
        taskId,
        boardId,
        results: {
          taskAnalysis: processingResult.taskAnalysis
            ? {
                success: processingResult.taskAnalysis.success,
                confidence: processingResult.taskAnalysis.confidence || 0,
                context: processingResult.taskAnalysis.context,
                suggestedTags: processingResult.taskAnalysis.suggestedTags,
                priority: processingResult.taskAnalysis.priority,
                estimatedDuration:
                  processingResult.taskAnalysis.estimatedDuration,
              }
            : undefined,
          contextExtraction: processingResult.contextExtraction
            ? {
                success: processingResult.contextExtraction.success,
                confidence: processingResult.contextExtraction.confidence || 0,
                tags: processingResult.contextExtraction.tags,
              }
            : undefined,
          actionExtraction: processingResult.actionExtraction
            ? {
                success: processingResult.actionExtraction.success,
                confidence: processingResult.actionExtraction.confidence || 0,
                actionsCount: processingResult.actionExtraction.totalActions,
              }
            : undefined,
          errors: processingResult.errors,
        },
        processingTimeMs: processingResult.processingTimeMs || 0,
      };

      await this.resultQueue.add("process-result", resultData, {
        jobId: `agent-result-${taskId}`,
        attempts: 1, // Results are idempotent
      });

      this.logger.log(`Sent agent result to API for task ${taskId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to send agent result to API for task ${taskId}: ${errorMessage}`,
      );
      // Don't throw - result sending failure shouldn't fail the processing
    }
  }
}
