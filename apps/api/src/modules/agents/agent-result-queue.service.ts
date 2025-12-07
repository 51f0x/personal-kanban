import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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

@Injectable()
export class AgentResultQueueService {
  private readonly logger = new Logger(AgentResultQueueService.name);

  constructor(
    @InjectQueue('agent-results') private readonly resultQueue: Queue<AgentResultJobData>,
  ) {}

  /**
   * Add a job to the result queue (called by worker)
   * This is used internally - workers send results here
   */
  async addResult(data: AgentResultJobData): Promise<void> {
    try {
      await this.resultQueue.add(
        'process-result',
        data,
        {
          jobId: `agent-result-${data.taskId}`,
          attempts: 1, // Results are idempotent
        },
      );

      this.logger.log(`Queued agent result for task ${data.taskId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to queue agent result for task ${data.taskId}: ${errorMessage}`);
      throw error;
    }
  }
}
