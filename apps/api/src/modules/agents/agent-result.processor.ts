import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { AgentResultJobData } from './agent-result-queue.service';

/**
 * Job processor for agent result queue
 * Receives results from worker after task processing
 */
@Processor('agent-results')
export class AgentResultProcessor extends WorkerHost {
    private readonly logger = new Logger(AgentResultProcessor.name);

    async process(job: Job<AgentResultJobData>): Promise<void> {
        const { taskId, boardId, results, processingTimeMs } = job.data;

        this.logger.log(`Processing agent result for task ${taskId} (${processingTimeMs}ms)`);

        try {
            // Results are already written to database by worker
            // This processor can be used for:
            // - Notifications
            // - Analytics
            // - WebSocket updates
            // - Additional processing if needed

            this.logger.log(
                `Agent processing completed for task ${taskId}: ` +
                    `taskAnalysis: ${results.taskAnalysis?.success ? 'success' : 'failed'}, ` +
                    `contextExtraction: ${results.contextExtraction?.success ? 'success' : 'failed'}, ` +
                    `actionExtraction: ${results.actionExtraction?.success ? 'success' : 'failed'}, ` +
                    `errors: ${results.errors?.length || 0}`,
            );

            // TODO: Add any additional processing here:
            // - Send WebSocket notification to clients
            // - Update analytics
            // - Trigger follow-up actions
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error processing agent result for task ${taskId}: ${errorMessage}`);
            // Don't throw - result processing failure shouldn't fail the job
        }
    }
}
