import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface AgentProcessingJobData {
  taskId: string;
  boardId: string;
  progressCallbackUrl: string; // API endpoint to call for progress updates
}

@Injectable()
export class AgentQueueService {
  private readonly logger = new Logger(AgentQueueService.name);

  constructor(
    @InjectQueue('agent-processing') private readonly agentQueue: Queue<AgentProcessingJobData>,
  ) {}

  /**
   * Queue a task for agent processing
   */
  async queueAgentProcessing(
    taskId: string,
    boardId: string,
    progressCallbackUrl: string,
  ): Promise<void> {
    try {
      await this.agentQueue.add(
        'process-task',
        {
          taskId,
          boardId,
          progressCallbackUrl,
        },
        {
          jobId: `agent-processing-${taskId}`, // Unique job ID to prevent duplicates
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(`Queued agent processing job for task ${taskId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to queue agent processing for task ${taskId}: ${errorMessage}`);
      throw error;
    }
  }
}

