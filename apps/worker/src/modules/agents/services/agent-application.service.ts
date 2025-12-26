import { Inject, Injectable, Logger } from "@nestjs/common";
import type { PrismaService } from "@personal-kanban/shared";
import { Prisma, TaskContext } from "@prisma/client";
import { HintService } from "./hint.service";
import {
  AgentProcessingProgress,
  AgentProcessingResult,
  AgentProgressCallback,
} from "../types/types";

/**
 * Agent Application Service
 * Handles applying agent results to tasks to prepare them for human execution
 * Combines results from multiple agents into clear, actionable work descriptions
 * Separated from orchestration to maintain clear responsibilities
 */
@Injectable()
export class AgentApplicationService {
  private readonly logger = new Logger(AgentApplicationService.name);

  constructor(
    @Inject("PrismaService") private readonly prisma: PrismaService,
    private readonly hintService: HintService,
  ) {}

  /**
   * Apply agent results to a task (update task with agent insights)
   */
  async applyResultsToTask(
    taskId: string,
    results: AgentProcessingResult,
    options?: {
      updateTitle?: boolean;
      updateDescription?: boolean;
      updateContext?: boolean;
      updateTags?: boolean;
      updatePriority?: boolean;
      addChecklistFromActions?: boolean;
      onProgress?: AgentProgressCallback;
    },
  ): Promise<void> {
    const onProgress = options?.onProgress;

    const emitProgress = async (
      stage: AgentProcessingProgress["stage"],
      progress: number,
      message: string,
      details?: AgentProcessingProgress["details"],
    ) => {
      const progressUpdate: AgentProcessingProgress = {
        taskId,
        stage,
        progress,
        message,
        details,
        timestamp: new Date().toISOString(),
      };

      if (onProgress) {
        try {
          await onProgress(progressUpdate);
        } catch (callbackError) {
          this.logger.warn(
            "Progress callback failed during apply",
            callbackError,
          );
        }
      }
    };

    try {
      await emitProgress(
        "applying-results",
        0,
        "Creating hints from agent results...",
      );

      // Create hints from all agent results first
      await this.hintService.createHintsFromResults(taskId, results);

      await emitProgress(
        "applying-results",
        20,
        "Preparing results for API...",
      );

      // Worker does not query database - all data comes from Redis message
      // Results are sent back to API via result queue, and API applies them
      // Hints are created here and stored in worker database
      
      const updates: {
        title?: string;
        description?: string;
        context?: TaskContext;
        metadata?: Prisma.InputJsonValue;
      } = {};

      const tagsToAdd: string[] = [];
      const checklistItems: Array<{
        title: string;
        isDone: boolean;
        position: number;
      }> = [];

      // Update title if suggested
      if (options?.updateTitle && results.taskAnalysis?.suggestedTitle) {
        updates.title = results.taskAnalysis.suggestedTitle;
      }

      // Update description by combining results into a clear, executable work description
      // Note: Markdown conversion happens AFTER hints are auto-applied (in task-processor.service.ts)
      if (options?.updateDescription) {
        const suggestedDesc = results.taskAnalysis?.suggestedDescription;
        const summary = results.summarization?.summary;
        const keyPoints = results.summarization?.keyPoints;
        // Use original description from results (from Redis message)
        const currentDesc = results.description || "";

        // Build an executable work description that combines:
        // 1. Suggested description (from task analysis - most important)
        // 2. Current description (preserve user's original content)
        // 3. Content summary (context from web content)
        // 4. Key points (if available, for quick reference)

        const parts: string[] = [];

        // Start with suggested description if available (it's already optimized)
        if (suggestedDesc) {
          parts.push(suggestedDesc);
        } else if (currentDesc) {
          // Fall back to current description if no suggestion
          parts.push(currentDesc);
        }

        // Add content summary for context if available and different
        if (summary && summary !== suggestedDesc) {
          parts.push(`\n\n**Context from source:**\n${summary}`);
        }

        // Add key points if available for quick reference
        if (keyPoints && keyPoints.length > 0) {
          const pointsText = keyPoints.map((p) => `- ${p}`).join("\n");
          parts.push(`\n\n**Key points:**\n${pointsText}`);
        }

        if (parts.length > 0) {
          updates.description = parts.join("\n\n").trim();
        }
      }

      // Update context
      if (options?.updateContext) {
        const context: TaskContext | undefined =
          results.taskAnalysis?.context || results.contextExtraction?.context;
        if (context) {
          updates.context = context;
        }
      }

      // Collect tags
      if (options?.updateTags) {
        const tags = [
          ...(results.taskAnalysis?.suggestedTags || []),
          ...(results.contextExtraction?.tags || []),
        ];
        tagsToAdd.push(...tags);
      }

      // Collect checklist items from actions
      // Position will be determined by API when applying results
      if (
        options?.addChecklistFromActions &&
        results.actionExtraction?.actions
      ) {
        results.actionExtraction.actions.forEach((action) => {
          checklistItems.push({
            title: action.description,
            isDone: false,
            position: 0, // Will be set by API
          });
        });
      }

      // Store minimal metadata (processing info, not the full results)
      // Hints are created separately at the beginning of this method
      const hintCount = await this.prisma.hint.count({ where: { taskId } });
      updates.metadata = {
        agentProcessing: {
          processedAt: new Date().toISOString(),
          processingTimeMs: results.processingTimeMs,
          url: results.url,
          hintCount,
          errors: results.errors,
        },
      } as Prisma.InputJsonValue;

      // Note: Task updates are sent back to API via result queue
      // The API will apply these updates to the task
      // Worker only creates hints here

      // Worker does not update tasks directly - API will apply updates when it receives results
      // The results object already contains all the data needed for the API to apply updates
      // (suggestedTitle, suggestedDescription, context, tags, actions, etc.)
      
      await emitProgress(
        "applying-results",
        100,
        "Results prepared for API",
        {
          checklistItemsAdded: checklistItems.length,
          tagsToAdd: tagsToAdd.length,
        },
      );

      this.logger.log(
        `Prepared agent results for task ${taskId} (API will apply updates): ` +
        `${checklistItems.length} checklist items, ${tagsToAdd.length} tags`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error applying results to task ${taskId}: ${errorMessage}`,
      );
      throw error;
    }
  }
}
