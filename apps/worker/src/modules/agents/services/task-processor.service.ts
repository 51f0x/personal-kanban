import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@personal-kanban/shared";
import { ToMarkdownAgent } from "../agents/to-markdown.agent";
import { AgentApplicationService } from "./agent-application.service";
import { AgentOrchestrator } from "./agent-orchestrator.service";
import { AgentProcessingResult, AgentProgressCallback } from "../types/types";

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
    private readonly agentApplicationService: AgentApplicationService,
    private readonly toMarkdownAgent: ToMarkdownAgent,
  ) {}

  /**
   * Process a task with agents automatically
   * Can be called from a BullMQ job processor
   * Supports progress callbacks for real-time updates
   * Returns processing results for sending back to API
   */
  async processTaskWithAgents(
    taskId: string,
    options?: {
      updateTask?: boolean;
      skipWebContent?: boolean;
      skipSummarization?: boolean;
      onProgress?: AgentProgressCallback;
    },
  ): Promise<AgentProcessingResult> {
    try {
      this.logger.log(`Starting agent processing for task ${taskId}`);

      // Process task with all agents
      const results = await this.agentOrchestrator.processTask(taskId, {
        skipWebContent: options?.skipWebContent,
        skipSummarization: options?.skipSummarization,
        onProgress: options?.onProgress,
      });

      // Apply results to task if requested
      // Note: Hint creation is now handled inside AgentApplicationService
      if (options?.updateTask !== false) {
        await this.agentApplicationService.applyResultsToTask(taskId, results, {
          updateTitle: true,
          updateDescription: true,
          updateContext: true,
          updateTags: true,
          addChecklistFromActions: true,
          onProgress: options?.onProgress,
        });
      }

      // Step: Convert task description to markdown AFTER hints are auto-applied
      // This ensures markdown conversion uses the final description with applied hints
      await this.convertDescriptionToMarkdown(taskId, options?.onProgress);

      this.logger.log(
        `Completed agent processing for task ${taskId} ` +
          `(${results.errors?.length || 0} errors)`,
      );

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error in task processor for task ${taskId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Convert task description to markdown format
   * This is called after hints are auto-applied to ensure we format the final description
   */
  private async convertDescriptionToMarkdown(
    taskId: string,
    onProgress?: AgentProgressCallback,
  ): Promise<void> {
    try {
      // Fetch the updated task (after hints were auto-applied)
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          title: true,
          description: true,
        },
      });

      if (!task) {
        this.logger.warn(`Task ${taskId} not found for markdown conversion`);
        return;
      }

      // Skip if no description to format
      if (!task.description || task.description.trim().length === 0) {
        this.logger.log(
          `Skipping markdown conversion - no description for task ${taskId}`,
        );
        return;
      }

      if (onProgress) {
        await onProgress({
          taskId,
          stage: "formatting-markdown",
          progress: 95,
          message: "Converting description to markdown format...",
          timestamp: new Date().toISOString(),
        });
      }

      // Convert description to markdown
      const markdownResult = await this.toMarkdownAgent.formatToMarkdown(
        task.title,
        task.description,
      );

      if (markdownResult.success && markdownResult.formattedDescription) {
        // Update task with markdown-formatted description
        await this.prisma.task.update({
          where: { id: taskId },
          data: {
            description: markdownResult.formattedDescription,
          },
        });

        // Create a hint for the markdown conversion (for visibility, but it's already applied)
        await this.prisma.hint.create({
          data: {
            taskId,
            agentId: "to-markdown-agent",
            hintType: "description",
            title: "Description Formatted (Markdown)",
            content: markdownResult.formattedDescription,
            data: {
              originalLength: markdownResult.originalLength,
              formattedLength: markdownResult.formattedLength,
            },
            confidence: markdownResult.confidence,
            applied: true, // Already applied since we updated the task
          },
        });

        this.logger.log(
          `Converted description to markdown for task ${taskId} ` +
            `(${markdownResult.originalLength} → ${markdownResult.formattedLength} chars)`,
        );

        if (onProgress) {
          await onProgress({
            taskId,
            stage: "formatting-markdown",
            progress: 98,
            message: "Description converted to markdown",
            details: {
              agentId: "to-markdown-agent",
              confidence: markdownResult.confidence,
              originalLength: markdownResult.originalLength,
              formattedLength: markdownResult.formattedLength,
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        const errorMessage = markdownResult.error || "Unknown error";
        this.logger.warn(
          `Failed to convert description to markdown for task ${taskId}: ${errorMessage}`,
        );

        if (onProgress) {
          await onProgress({
            taskId,
            stage: "error",
            progress: 95,
            message: `Markdown conversion failed: ${errorMessage}`,
            details: {
              agentId: "to-markdown-agent",
              error: errorMessage,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error converting description to markdown for task ${taskId}: ${errorMessage}`,
      );
      // Don't throw - markdown conversion failure shouldn't fail the entire process
    }
  }
}
