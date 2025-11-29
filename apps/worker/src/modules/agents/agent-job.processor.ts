import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { TaskProcessorService } from './task-processor.service';
import type { AgentProgressCallback } from './types';

interface AgentProcessingJobData {
  taskId: string;
  boardId: string;
  progressCallbackUrl: string;
}

/**
 * Job processor for agent processing queue
 * Processes tasks with agents and reports progress via HTTP callbacks
 */
@Processor('agent-processing')
export class AgentJobProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentJobProcessor.name);
  private readonly apiBaseUrl: string;

  constructor(
    private readonly taskProcessorService: TaskProcessorService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    super();
    this.apiBaseUrl = this.configService.get<string>('API_URL', 'http://localhost:3000');
  }

  async process(job: Job<AgentProcessingJobData>): Promise<void> {
    const { taskId, boardId, progressCallbackUrl } = job.data;

    this.logger.log(`Processing agent job for task ${taskId}`);

    try {
      // Create progress callback that sends HTTP requests to API
      const progressCallback: AgentProgressCallback = async (progress) => {
        try {
          const callbackUrl = progressCallbackUrl || `${this.apiBaseUrl}/api/v1/agents/progress/update`;
          
          // Include boardId in progress details for the API
          const progressWithBoardId = {
            ...progress,
            details: {
              ...progress.details,
              boardId,
            },
          };

          // Make HTTP callback to API
          const response = await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progressWithBoardId),
          });

          if (!response.ok) {
            this.logger.warn(`Progress callback failed: ${response.statusText}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to send progress callback: ${error}`);
          // Don't throw - progress callbacks are non-blocking
        }
      };

      // Process task with agents
      // updateTask: false means hints will be created but task won't be auto-updated
      await this.taskProcessorService.processTaskWithAgents(taskId, {
        updateTask: false, // Only create hints, don't auto-apply updates
        skipWebContent: false,
        skipSummarization: false,
        onProgress: progressCallback,
      });

      this.logger.log(`Completed agent processing for task ${taskId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing agent job for task ${taskId}: ${errorMessage}`);
      throw error; // Re-throw to mark job as failed
    }
  }
}

