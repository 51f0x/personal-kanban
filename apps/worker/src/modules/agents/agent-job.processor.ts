import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@personal-kanban/shared';
import type { Job } from 'bullmq';
import { TaskProcessorService } from './task-processor.service';
import { AgentResultSenderService } from './agent-result-sender.service';
import type { AgentProgressCallback } from './types';

interface AgentProcessingJobData {
    taskId: string;
    boardId?: string; // Optional, can be extracted from task if needed
    progressCallbackUrl?: string; // Deprecated - kept for backward compatibility
}

/**
 * Job processor for agent processing queue
 * Processes tasks with agents and reports progress via HTTP callbacks
 */
@Processor('agent-processing')
export class AgentJobProcessor extends WorkerHost {
    private readonly logger = new Logger(AgentJobProcessor.name);
    private readonly apiBaseUrl: string;
    private readonly internalServiceToken: string | undefined;

    constructor(
        private readonly taskProcessorService: TaskProcessorService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly resultSenderService: AgentResultSenderService,
    ) {
        super();
        this.apiBaseUrl = this.configService.get<string>('API_URL', 'http://localhost:3000');
        this.internalServiceToken = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    }

    async process(job: Job<AgentProcessingJobData>): Promise<void> {
        const { taskId, boardId } = job.data;

        this.logger.log(`Processing agent job for task ${taskId}`);

        try {
            // Get boardId from task if not provided
            let taskBoardId = boardId;
            if (!taskBoardId) {
                const task = await this.prisma.task.findUnique({
                    where: { id: taskId },
                    select: { boardId: true },
                });
                if (!task) {
                    throw new Error(`Task ${taskId} not found`);
                }
                taskBoardId = task.boardId;
            }

            // Process task with agents and get results
            // Progress events are now published via event bus instead of HTTP callbacks
            // updateTask: true means results will be applied to task and hints created
            const results = await this.taskProcessorService.processTaskWithAgents(taskId, {
                updateTask: true, // Apply results to task and create hints
                skipWebContent: false,
                skipSummarization: false,
                // onProgress callback removed - events are published automatically
            });

            // Send results back to API via queue
            if (results) {
                await this.resultSenderService.sendResult(taskId, taskBoardId, results);
            }

            this.logger.log(`Completed agent processing for task ${taskId}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error processing agent job for task ${taskId}: ${errorMessage}`);
            throw error; // Re-throw to mark job as failed
        }
    }
}
