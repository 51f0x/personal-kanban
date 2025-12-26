import { Inject, Injectable, Logger } from "@nestjs/common";
import type { PrismaService } from "@personal-kanban/shared";
import { Prisma } from "@prisma/client";
import { AgentProcessingResult } from "../types/types";

/**
 * Hint creation function type
 */
type HintCreator = (
  taskId: string,
  results: AgentProcessingResult,
) => Array<{
  taskId: string;
  agentId: string;
  hintType: string;
  title: string;
  content?: string | null;
  data?: Prisma.InputJsonValue;
  confidence?: number | null;
}>;

/**
 * Hint Service
 * Creates hints from agent results and attaches them to tasks
 */
@Injectable()
export class HintService {
  private readonly logger = new Logger(HintService.name);

  constructor(@Inject("PrismaService") private readonly prisma: PrismaService) {}

  /**
   * Create hints from agent processing results
   * Uses functional approach with declarative hint creators
   */
  async createHintsFromResults(
    taskId: string,
    results: AgentProcessingResult,
  ): Promise<void> {
    try {
      // Worker does not query database - task data comes from Redis message
      // If task doesn't exist, foreign key constraint will handle it
      const hints = this.getHintCreators()
        .flatMap((creator) => creator(taskId, results))
        .filter(Boolean);

      if (hints.length === 0) {
        return;
      }

      // Create all hints in a transaction using batch insert
      await this.prisma.hint.createMany({
        data: hints,
        skipDuplicates: true,
      });

      // Fetch created hints to get their IDs (for auto-apply)
      const createdHints = await this.prisma.hint.findMany({
        where: {
          taskId,
          createdAt: {
            gte: new Date(Date.now() - 5000), // Created in last 5 seconds
          },
        },
        orderBy: { createdAt: "desc" },
        take: hints.length,
      });

      const createdHintIds = createdHints.map((h) => h.id);

      this.logger.log(`Created ${hints.length} hints for task ${taskId}`, {
        taskId,
        hintCount: hints.length,
        hintTypes: Array.from(new Set(hints.map((h) => h.hintType))),
      });

      // Auto-apply hints with confidence >= 80%
      await this.autoApplyHighConfidenceHints(taskId, createdHintIds);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error creating hints for task ${taskId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Get array of hint creator functions
   * Each function transforms a specific result type into hints
   */
  private getHintCreators(): HintCreator[] {
    return [
      this.createWebContentHints.bind(this),
      this.createSummarizationHints.bind(this),
      this.createTaskAnalysisHints.bind(this),
      this.createContextExtractionHints.bind(this),
      this.createActionExtractionHints.bind(this),
      this.createTaskAssistantHints.bind(this),
    ];
  }

  /**
   * Create hints from web content result
   */
  private createWebContentHints: HintCreator = (taskId, results) => {
    const webContent = results.webContent;
    if (!webContent?.success) return [];

    return [
      {
        taskId,
        agentId: "web-content-agent",
        hintType: "web-content",
        title: "Downloaded Content",
        content: webContent.title || `Content from ${webContent.url}`,
        data: {
          url: webContent.url,
          title: webContent.title,
          contentType: webContent.contentType,
          contentLength: webContent.textContent?.length || 0,
        } as Prisma.InputJsonValue,
        confidence: webContent.confidence,
      },
    ];
  };

  /**
   * Create hints from summarization result
   */
  private createSummarizationHints: HintCreator = (taskId, results) => {
    const summarization = results.summarization;
    if (!summarization?.success) return [];

    return [
      {
        taskId,
        agentId: "content-summarizer-agent",
        hintType: "summary",
        title: "Content Summary",
        content: summarization.summary,
        data: {
          originalLength: summarization.originalLength,
          wordCount: summarization.wordCount,
          keyPoints: summarization.keyPoints,
        } as Prisma.InputJsonValue,
        confidence: summarization.confidence,
      },
    ];
  };

  /**
   * Create hints from task analysis result
   */
  private createTaskAnalysisHints: HintCreator = (taskId, results) => {
    const taskAnalysis = results.taskAnalysis;
    if (!taskAnalysis?.success) return [];

    const hints = [];

    if (taskAnalysis.suggestedTitle) {
      hints.push({
        taskId,
        agentId: "task-analyzer-agent",
        hintType: "title",
        title: "Suggested Title",
        content: taskAnalysis.suggestedTitle,
        confidence: taskAnalysis.confidence,
      });
    }

    if (taskAnalysis.suggestedDescription) {
      hints.push({
        taskId,
        agentId: "task-analyzer-agent",
        hintType: "description",
        title: "Suggested Description",
        content: taskAnalysis.suggestedDescription,
        confidence: taskAnalysis.confidence,
      });
    }

    if (taskAnalysis.context) {
      hints.push({
        taskId,
        agentId: "task-analyzer-agent",
        hintType: "context",
        title: "Suggested Context",
        content: taskAnalysis.context,
        confidence: taskAnalysis.confidence,
      });
    }

    if (taskAnalysis.suggestedTags?.length) {
      hints.push({
        taskId,
        agentId: "task-analyzer-agent",
        hintType: "tags",
        title: "Suggested Tags",
        data: { tags: taskAnalysis.suggestedTags } as Prisma.InputJsonValue,
        confidence: taskAnalysis.confidence,
      });
    }

    if (taskAnalysis.priority) {
      hints.push({
        taskId,
        agentId: "task-analyzer-agent",
        hintType: "priority",
        title: "Suggested Priority",
        content: taskAnalysis.priority,
        confidence: taskAnalysis.confidence,
      });
    }

    if (taskAnalysis.estimatedDuration) {
      hints.push({
        taskId,
        agentId: "task-analyzer-agent",
        hintType: "duration",
        title: "Estimated Duration",
        content: taskAnalysis.estimatedDuration,
        confidence: taskAnalysis.confidence,
      });
    }

    return hints;
  };

  /**
   * Create hints from context extraction result
   */
  private createContextExtractionHints: HintCreator = (taskId, results) => {
    const contextExtraction = results.contextExtraction;
    if (!contextExtraction?.success) return [];

    const hints = [];

    if (contextExtraction.context) {
      hints.push({
        taskId,
        agentId: "context-extractor-agent",
        hintType: "context",
        title: "Suggested Context",
        content: contextExtraction.context,
        confidence: contextExtraction.confidence,
      });
    }

    if (contextExtraction.tags?.length) {
      hints.push({
        taskId,
        agentId: "context-extractor-agent",
        hintType: "tags",
        title: "Suggested Tags",
        data: { tags: contextExtraction.tags } as Prisma.InputJsonValue,
        confidence: contextExtraction.confidence,
      });
    }

    if (contextExtraction.projectHints?.length) {
      hints.push({
        taskId,
        agentId: "context-extractor-agent",
        hintType: "project-hints",
        title: "Suggested Projects",
        data: {
          projects: contextExtraction.projectHints,
        } as Prisma.InputJsonValue,
        confidence: contextExtraction.confidence,
      });
    }

    return hints;
  };

  /**
   * Create hints from action extraction result
   */
  private createActionExtractionHints: HintCreator = (taskId, results) => {
    const actionExtraction = results.actionExtraction;
    if (!actionExtraction?.success) return [];

    const hints = [];

    if (actionExtraction.actions) {
      hints.push({
        taskId,
        agentId: "action-extractor-agent",
        hintType: "actions",
        title: "Suggested Actions",
        data: {
          actions: actionExtraction.actions,
          totalActions: actionExtraction.totalActions,
        } as Prisma.InputJsonValue,
        confidence: actionExtraction.confidence,
      });
    }

    if (actionExtraction.solutions?.length) {
      const solutionCount =
        actionExtraction.totalSolutions || actionExtraction.solutions.length;
      hints.push({
        taskId,
        agentId: "action-extractor-agent",
        hintType: "solutions",
        title: `Proposed Solutions (${solutionCount})`,
        content: `Based on the task context, here are ${actionExtraction.solutions.length} solution approach${actionExtraction.solutions.length > 1 ? "es" : ""} to consider:`,
        data: {
          solutions: actionExtraction.solutions,
          totalSolutions: solutionCount,
        } as unknown as Prisma.InputJsonValue,
        confidence: actionExtraction.confidence,
      });
    }

    return hints;
  };

  /**
   * Create hints from task assistant result (primary workflow)
   */
  private createTaskAssistantHints: HintCreator = (taskId, results) => {
    const taskAssistant = results.taskAssistant;
    if (!taskAssistant?.success) return [];

    const hints = [];

    // Main result - use qualityCheck.finalResult or implementation.result
    const finalResult =
      taskAssistant.qualityCheck?.finalResult ||
      taskAssistant.implementation?.result;
    if (finalResult) {
      hints.push({
        taskId,
        agentId: "task-assistant-agent",
        hintType: "description",
        title: "Task Assistant Result",
        content: finalResult,
        data: {
          completeness: taskAssistant.qualityCheck?.completeness,
          clarity: taskAssistant.qualityCheck?.clarity,
          practicality: taskAssistant.qualityCheck?.practicality,
          steps: taskAssistant.implementation?.steps || [],
          deliverables: taskAssistant.implementation?.deliverables || [],
        } as Prisma.InputJsonValue,
        confidence: taskAssistant.confidence || 0.8,
      });
    }

    // Clarification questions (if needed)
    if (
      taskAssistant.needsClarification &&
      taskAssistant.clarificationQuestions?.length
    ) {
      hints.push({
        taskId,
        agentId: "task-assistant-agent",
        hintType: "help",
        title: "Clarification Questions",
        content: taskAssistant.clarificationQuestions.join("\n\n"),
        data: {
          questions: taskAssistant.clarificationQuestions,
          needsClarification: true,
        },
        confidence: taskAssistant.confidence || 0.7,
      });
    }

    // Structure information
    if (taskAssistant.structure) {
      const structure = taskAssistant.structure;
      const requirementsText =
        structure.requirements?.map((r) => `- ${r}`).join("\n") || "None";
      const constraintsText =
        structure.constraints?.map((c) => `- ${c}`).join("\n") || "None";
      const assumptionsText = structure.assumptions?.length
        ? `\n\n**Assumptions:**\n${structure.assumptions.map((a) => `- ${a}`).join("\n")}`
        : "";

      hints.push({
        taskId,
        agentId: "task-assistant-agent",
        hintType: "help",
        title: "Task Structure",
        content: `**Goal:** ${structure.goal}\n\n**Requirements:**\n${requirementsText}\n\n**Constraints:**\n${constraintsText}\n\n**Desired Result:**\n${structure.desiredResult}${assumptionsText}`,
        data: {
          goal: structure.goal,
          requirements: structure.requirements || [],
          constraints: structure.constraints || [],
          desiredResult: structure.desiredResult,
          format: structure.format,
          style: structure.style,
          assumptions: structure.assumptions || [],
        } as Prisma.InputJsonValue,
        confidence: taskAssistant.confidence || 0.8,
      });
    }

    return hints;
  };

  /**
   * Get all hints for a task
   */
  async getHintsForTask(taskId: string) {
    return this.prisma.hint.findMany({
      where: { taskId },
      orderBy: [
        { applied: "asc" }, // Unapplied hints first
        { confidence: "desc" }, // Higher confidence first
        { createdAt: "desc" }, // Newer first
      ],
    });
  }

  /**
   * Mark a hint as applied
   */
  async applyHint(hintId: string): Promise<void> {
    await this.prisma.hint.update({
      where: { id: hintId },
      data: { applied: true },
    });
  }

  /**
   * Delete a hint
   */
  async deleteHint(hintId: string): Promise<void> {
    await this.prisma.hint.delete({
      where: { id: hintId },
    });
  }

  /**
   * Auto-apply hints with confidence >= 80%
   * Hints are marked as applied automatically
   *
   * For description hints, only the best one is applied to prevent overriding better content.
   * Summary and help hints are supplementary and can be appended.
   */
  private async autoApplyHighConfidenceHints(
    taskId: string,
    hintIds: string[],
  ): Promise<void> {
    try {
      // Fetch all created hints with their data
      const hints = await this.prisma.hint.findMany({
        where: {
          id: { in: hintIds },
          applied: false, // Only apply unapplied hints
        },
        include: {
          task: true,
        },
      });

      // Filter hints with confidence >= 80% (0.8)
      const highConfidenceHints = hints.filter(
        (hint) => hint.confidence !== null && hint.confidence >= 0.8,
      );

      if (highConfidenceHints.length === 0) {
        this.logger.debug(
          `No high-confidence hints to auto-apply for task ${taskId}`,
        );
        return;
      }

      // Group hints by type to handle conflicts
      const hintsToApply = this.selectBestHints(highConfidenceHints);

      this.logger.log(
        `Auto-applying ${hintsToApply.length} high-confidence hints (>=80%) for task ${taskId}: ${hintsToApply.map((h) => `${h.hintType} (${(h.confidence || 0) * 100}%)`).join(", ")}`,
      );

      // Apply each selected hint
      for (const hint of hintsToApply) {
        try {
          await this.applyHintToTask(hint);
          this.logger.log(
            `Auto-applied hint ${hint.id} (confidence: ${hint.confidence}, type: ${hint.hintType})`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.logger.error(
            `Failed to auto-apply hint ${hint.id}: ${errorMessage}`,
          );
          // Continue with other hints even if one fails
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error auto-applying high-confidence hints for task ${taskId}: ${errorMessage}`,
      );
      // Don't throw - auto-apply failures shouldn't block hint creation
    }
  }

  /**
   * Select the best hints to apply, resolving conflicts
   * - For description hints: only the best one (highest confidence + agent priority)
   * - For other hints: all can be applied (they don't conflict)
   */
  private selectBestHints(
    hints: Array<{
      id: string;
      taskId: string;
      hintType: string;
      agentId: string;
      confidence: number | null;
      content: string | null;
      data: unknown;
      task: { id: string; boardId: string; description: string | null };
    }>,
  ): Array<{
    id: string;
    taskId: string;
    hintType: string;
    agentId: string;
    confidence: number | null;
    content: string | null;
    data: unknown;
    task: { id: string; boardId: string; description: string | null };
  }> {
    // Agent priority for description hints (higher = better)
    // task-assistant is the most comprehensive, so it takes priority
    const agentPriority: Record<string, number> = {
      "task-assistant-agent": 3,
      "task-analyzer-agent": 2,
      "content-summarizer-agent": 1,
      "task-help-agent": 1,
    };

    // Separate description hints from other hints
    const descriptionHints = hints.filter((h) => h.hintType === "description");
    const otherHints = hints.filter((h) => h.hintType !== "description");

    // For description hints, select only the best one
    let selectedDescriptionHint:
      | {
          id: string;
          taskId: string;
          hintType: string;
          agentId: string;
          confidence: number | null;
          content: string | null;
          data: unknown;
          task: { id: string; boardId: string; description: string | null };
        }
      | undefined;

    if (descriptionHints.length > 0) {
      // Sort by: confidence (desc), then agent priority (desc)
      descriptionHints.sort((a, b) => {
        const confidenceA = a.confidence ?? 0;
        const confidenceB = b.confidence ?? 0;

        // First compare by confidence
        if (confidenceA !== confidenceB) {
          return confidenceB - confidenceA;
        }

        // If confidence is equal, compare by agent priority
        const priorityA = agentPriority[a.agentId] ?? 0;
        const priorityB = agentPriority[b.agentId] ?? 0;
        return priorityB - priorityA;
      });

      selectedDescriptionHint = descriptionHints[0];

      if (descriptionHints.length > 1) {
        this.logger.debug(
          `Multiple description hints found (${descriptionHints.length}), selecting best: ${selectedDescriptionHint.agentId} (confidence: ${selectedDescriptionHint.confidence})`,
        );
      }
    }

    // Combine hints: description first (so summary/help can append to it), then others
    const selectedHints: Array<{
      id: string;
      taskId: string;
      hintType: string;
      agentId: string;
      confidence: number | null;
      content: string | null;
      data: unknown;
      task: { id: string; boardId: string; description: string | null };
    }> = [];

    // Apply description hint first (if any)
    if (selectedDescriptionHint) {
      selectedHints.push(selectedDescriptionHint);
    }

    // Then apply supplementary hints (summary, help) that append to description
    const supplementaryHints = otherHints.filter(
      (h) => h.hintType === "summary" || h.hintType === "help",
    );
    selectedHints.push(...supplementaryHints);

    // Finally apply all other hints (title, context, tags, actions, etc.)
    const remainingHints = otherHints.filter(
      (h) => h.hintType !== "summary" && h.hintType !== "help",
    );
    selectedHints.push(...remainingHints);

    return selectedHints;
  }

  /**
   * Apply a hint to a task - similar to API's applyHint but without WebSocket
   */
  private async applyHintToTask(hint: {
    id: string;
    taskId: string;
    hintType: string;
    content: string | null;
    data: unknown;
    task: { id: string; boardId: string; description: string | null };
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Mark hint as applied
      await tx.hint.update({
        where: { id: hint.id },
        data: { applied: true },
      });

      // Apply hint content to task based on hint type
      const updates: Record<string, unknown> = {};

      switch (hint.hintType) {
        case "title":
          if (hint.content) {
            updates.title = hint.content;
          }
          break;

        case "description":
          if (hint.content) {
            // Description hints replace the description (not append)
            // This ensures the best description hint is used, not concatenated
            updates.description = hint.content;
          }
          break;

        case "context":
          if (hint.content) {
            updates.context = hint.content;
          }
          break;

        case "tags":
          if (
            hint.data &&
            typeof hint.data === "object" &&
            "tags" in hint.data
          ) {
            const tagNames = (hint.data as { tags?: string[] }).tags || [];
            if (tagNames.length > 0) {
              const tagIds: string[] = [];

              for (const tagName of tagNames) {
                // Try to find existing tag by name
                const existingTag = await tx.tag.findFirst({
                  where: {
                    boardId: hint.task.boardId,
                    name: { equals: tagName, mode: "insensitive" },
                  },
                });

                let tagId: string;
                if (existingTag) {
                  tagId = existingTag.id;
                } else {
                  // Create new tag
                  const newTag = await tx.tag.create({
                    data: {
                      boardId: hint.task.boardId,
                      name: tagName,
                      color: "#94a3b8",
                    },
                  });
                  tagId = newTag.id;
                }

                tagIds.push(tagId);
              }

              // Link all tags to the task
              for (const tagId of tagIds) {
                await tx.taskTag.upsert({
                  where: {
                    taskId_tagId: {
                      taskId: hint.taskId,
                      tagId,
                    },
                  },
                  update: {},
                  create: {
                    taskId: hint.taskId,
                    tagId,
                  },
                });
              }
            }
          }
          break;

        case "actions":
          if (
            hint.data &&
            typeof hint.data === "object" &&
            "actions" in hint.data
          ) {
            const actions =
              (hint.data as { actions?: Array<{ description: string }> })
                .actions || [];
            if (actions.length > 0) {
              const existingCount = await tx.checklistItem.count({
                where: { taskId: hint.taskId },
              });

              await tx.checklistItem.createMany({
                data: actions.map((action, index) => ({
                  taskId: hint.taskId,
                  title: action.description,
                  isDone: false,
                  position: existingCount + index,
                })),
              });
            }
          }
          break;

        case "summary":
          if (hint.content) {
            const currentDescription = hint.task.description || "";
            updates.description = currentDescription
              ? `${currentDescription}\n\n[Summary]\n${hint.content}`
              : `[Summary]\n${hint.content}`;
          }
          break;

        case "priority":
          if (hint.content) {
            // Map priority string to enum value
            const priorityMap: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
              low: "LOW",
              medium: "MEDIUM",
              high: "HIGH",
            };
            const priorityValue = priorityMap[hint.content.toLowerCase()];
            if (priorityValue) {
              updates.priority = priorityValue;
            } else {
              this.logger.warn(`Invalid priority value: ${hint.content}`);
            }
          }
          break;

        case "duration":
          if (hint.content) {
            updates.duration = hint.content;
          }
          break;

        case "help":
          if (hint.content) {
            const currentDescription = hint.task.description || "";
            updates.description = currentDescription
              ? `${currentDescription}\n\n## Task Help\n\n${hint.content}`
              : `## Task Help\n\n${hint.content}`;
          }
          break;

        case "web-content":
        case "project-hints":
          // These are informational hints, don't auto-apply
          this.logger.debug(
            `Info hint type ${hint.hintType} - not auto-applied`,
          );
          break;

        default:
          this.logger.warn(
            `Unknown hint type for auto-apply: ${hint.hintType}`,
          );
      }

      // Apply updates to task if any
      if (Object.keys(updates).length > 0) {
        await tx.task.update({
          where: { id: hint.taskId },
          data: updates,
        });
      }
    });
  }
}
