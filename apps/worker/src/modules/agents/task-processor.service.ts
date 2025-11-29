import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AgentOrchestrator } from './agent-orchestrator.service';
import { HintService } from './hint.service';
import type { AgentProgressCallback } from './types';

/**
 * Task Processor Service
 * Processes tasks with agents automatically (e.g., via BullMQ jobs)
 */
@Injectable()
export class TaskProcessorService {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentOrchestrator: AgentOrchestrator,
    private readonly hintService: HintService,
  ) {}

  /**
   * Process a task with agents automatically
   * Can be called from a BullMQ job processor
   * Supports progress callbacks for real-time updates
   */
  async processTaskWithAgents(
    taskId: string,
    options?: {
      updateTask?: boolean;
      skipWebContent?: boolean;
      skipSummarization?: boolean;
      onProgress?: AgentProgressCallback;
    },
  ): Promise<void> {
    try {
      this.logger.log(`Starting agent processing for task ${taskId}`);

      // Process task with all agents
      const results = await this.agentOrchestrator.processTask(taskId, {
        skipWebContent: options?.skipWebContent,
        skipSummarization: options?.skipSummarization,
        onProgress: options?.onProgress,
      });

      // Always create hints from agent results (regardless of updateTask flag)
      // This ensures users can review and apply suggestions individually
      await this.hintService.createHintsFromResults(taskId, results);
      this.logger.log(`Created hints for task ${taskId}`);

      // Apply results to task if requested
      if (options?.updateTask !== false) {
        await this.agentOrchestrator.applyResultsToTask(taskId, results, {
          updateTitle: true,
          updateDescription: true,
          updateContext: true,
          updateTags: true,
          addChecklistFromActions: true,
          onProgress: options?.onProgress,
        });
      }

      this.logger.log(
        `Completed agent processing for task ${taskId} ` +
        `(${results.errors?.length || 0} errors)`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in task processor for task ${taskId}: ${errorMessage}`);
      throw error;
    }
  }
}

