import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  WebContentResult,
  SummarizationResult,
  TaskAnalysisResult,
  ContextExtractionResult,
  ActionExtractionResult,
  AgentProcessingResult,
} from './types';

/**
 * Hint Service
 * Creates hints from agent results and attaches them to tasks
 */
@Injectable()
export class HintService {
  private readonly logger = new Logger(HintService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create hints from agent processing results
   */
  async createHintsFromResults(taskId: string, results: AgentProcessingResult): Promise<void> {
    const hints = [];

    try {
      // Create hint from web content result
      if (results.webContent?.success) {
        hints.push({
          taskId,
          agentId: 'web-content-agent',
          hintType: 'web-content',
          title: 'Downloaded Content',
          content: results.webContent.title || `Content from ${results.webContent.url}`,
          data: {
            url: results.webContent.url,
            title: results.webContent.title,
            contentType: results.webContent.contentType,
            contentLength: results.webContent.textContent?.length || 0,
          },
          confidence: results.webContent.confidence,
        });
      }

      // Create hint from summarization result
      if (results.summarization?.success) {
        hints.push({
          taskId,
          agentId: 'content-summarizer-agent',
          hintType: 'summary',
          title: 'Content Summary',
          content: results.summarization.summary,
          data: {
            originalLength: results.summarization.originalLength,
            wordCount: results.summarization.wordCount,
            keyPoints: results.summarization.keyPoints,
          },
          confidence: results.summarization.confidence,
        });
      }

      // Create hints from task analysis result
      if (results.taskAnalysis?.success) {
        if (results.taskAnalysis.suggestedTitle) {
          hints.push({
            taskId,
            agentId: 'task-analyzer-agent',
            hintType: 'title',
            title: 'Suggested Title',
            content: results.taskAnalysis.suggestedTitle,
            confidence: results.taskAnalysis.confidence,
          });
        }

        if (results.taskAnalysis.suggestedDescription) {
          hints.push({
            taskId,
            agentId: 'task-analyzer-agent',
            hintType: 'description',
            title: 'Suggested Description',
            content: results.taskAnalysis.suggestedDescription,
            confidence: results.taskAnalysis.confidence,
          });
        }

        if (results.taskAnalysis.context) {
          hints.push({
            taskId,
            agentId: 'task-analyzer-agent',
            hintType: 'context',
            title: 'Suggested Context',
            content: results.taskAnalysis.context,
            confidence: results.taskAnalysis.confidence,
          });
        }

        if (results.taskAnalysis.suggestedTags && results.taskAnalysis.suggestedTags.length > 0) {
          hints.push({
            taskId,
            agentId: 'task-analyzer-agent',
            hintType: 'tags',
            title: 'Suggested Tags',
            data: {
              tags: results.taskAnalysis.suggestedTags,
            },
            confidence: results.taskAnalysis.confidence,
          });
        }

        if (results.taskAnalysis.priority) {
          hints.push({
            taskId,
            agentId: 'task-analyzer-agent',
            hintType: 'priority',
            title: 'Suggested Priority',
            content: results.taskAnalysis.priority,
            confidence: results.taskAnalysis.confidence,
          });
        }

        if (results.taskAnalysis.estimatedDuration) {
          hints.push({
            taskId,
            agentId: 'task-analyzer-agent',
            hintType: 'duration',
            title: 'Estimated Duration',
            content: results.taskAnalysis.estimatedDuration,
            confidence: results.taskAnalysis.confidence,
          });
        }
      }

      // Create hints from context extraction result
      if (results.contextExtraction?.success) {
        if (results.contextExtraction.context) {
          hints.push({
            taskId,
            agentId: 'context-extractor-agent',
            hintType: 'context',
            title: 'Suggested Context',
            content: results.contextExtraction.context,
            confidence: results.contextExtraction.confidence,
          });
        }

        if (results.contextExtraction.tags && results.contextExtraction.tags.length > 0) {
          hints.push({
            taskId,
            agentId: 'context-extractor-agent',
            hintType: 'tags',
            title: 'Suggested Tags',
            data: {
              tags: results.contextExtraction.tags,
            },
            confidence: results.contextExtraction.confidence,
          });
        }

        if (results.contextExtraction.projectHints && results.contextExtraction.projectHints.length > 0) {
          hints.push({
            taskId,
            agentId: 'context-extractor-agent',
            hintType: 'project-hints',
            title: 'Suggested Projects',
            data: {
              projects: results.contextExtraction.projectHints,
            },
            confidence: results.contextExtraction.confidence,
          });
        }
      }

      // Create hint from action extraction result
      if (results.actionExtraction?.success && results.actionExtraction.actions) {
        hints.push({
          taskId,
          agentId: 'action-extractor-agent',
          hintType: 'actions',
          title: 'Suggested Actions',
          data: {
            actions: results.actionExtraction.actions,
            totalActions: results.actionExtraction.totalActions,
          },
          confidence: results.actionExtraction.confidence,
        });
      }

      // Create all hints in a transaction using batch insert
      let createdHintIds: string[] = [];
      if (hints.length > 0) {
        // Use createMany for better performance, then fetch IDs if needed
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
          orderBy: { createdAt: 'desc' },
          take: hints.length,
        });

        createdHintIds = createdHints.map((h) => h.id);

        this.logger.log(`Created ${hints.length} hints for task ${taskId}`, {
          taskId,
          hintCount: hints.length,
          hintTypes: [...new Set(hints.map((h) => h.hintType))],
        });

        // Auto-apply hints with confidence >= 80%
        await this.autoApplyHighConfidenceHints(taskId, createdHintIds);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error creating hints for task ${taskId}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get all hints for a task
   */
  async getHintsForTask(taskId: string) {
    return this.prisma.hint.findMany({
      where: { taskId },
      orderBy: [
        { applied: 'asc' }, // Unapplied hints first
        { confidence: 'desc' }, // Higher confidence first
        { createdAt: 'desc' }, // Newer first
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
   */
  private async autoApplyHighConfidenceHints(taskId: string, hintIds: string[]): Promise<void> {
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
      const highConfidenceHints = hints.filter((hint) => hint.confidence !== null && hint.confidence >= 0.8);

      if (highConfidenceHints.length === 0) {
        this.logger.debug(`No high-confidence hints to auto-apply for task ${taskId}`);
        return;
      }

      this.logger.log(
        `Auto-applying ${highConfidenceHints.length} high-confidence hints (>=80%) for task ${taskId}: ` +
        highConfidenceHints.map((h) => `${h.hintType} (${(h.confidence || 0) * 100}%)`).join(', '),
      );

      // Apply each high-confidence hint
      for (const hint of highConfidenceHints) {
        try {
          await this.applyHintToTask(hint);
          this.logger.log(`Auto-applied hint ${hint.id} (confidence: ${hint.confidence}, type: ${hint.hintType})`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to auto-apply hint ${hint.id}: ${errorMessage}`);
          // Continue with other hints even if one fails
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error auto-applying high-confidence hints for task ${taskId}: ${errorMessage}`);
      // Don't throw - auto-apply failures shouldn't block hint creation
    }
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
        case 'title':
          if (hint.content) {
            updates.title = hint.content;
          }
          break;

        case 'description':
          if (hint.content) {
            const currentDescription = hint.task.description || '';
            updates.description = currentDescription
              ? `${currentDescription}\n\n${hint.content}`
              : hint.content;
          }
          break;

        case 'context':
          if (hint.content) {
            updates.context = hint.content;
          }
          break;

        case 'tags':
          if (hint.data && typeof hint.data === 'object' && 'tags' in hint.data) {
            const tagNames = (hint.data as { tags?: string[] }).tags || [];
            if (tagNames.length > 0) {
              const tagIds: string[] = [];

              for (const tagName of tagNames) {
                // Try to find existing tag by name
                const existingTag = await tx.tag.findFirst({
                  where: {
                    boardId: hint.task.boardId,
                    name: { equals: tagName, mode: 'insensitive' },
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
                      color: '#94a3b8',
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

        case 'actions':
          if (hint.data && typeof hint.data === 'object' && 'actions' in hint.data) {
            const actions = (hint.data as { actions?: Array<{ description: string }> }).actions || [];
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

        case 'summary':
          if (hint.content) {
            const currentDescription = hint.task.description || '';
            updates.description = currentDescription
              ? `${currentDescription}\n\n[Summary]\n${hint.content}`
              : `[Summary]\n${hint.content}`;
          }
          break;

        case 'priority':
          if (hint.content) {
            // Priority is stored in metadata or as a separate field
            // For now, we'll log it - may need to check schema
            this.logger.debug(`Priority hint: ${hint.content} - not auto-applied (needs schema support)`);
          }
          break;

        case 'duration':
          if (hint.content) {
            // Duration hint - similar to priority, may need schema support
            this.logger.debug(`Duration hint: ${hint.content} - not auto-applied (needs schema support)`);
          }
          break;

        case 'web-content':
        case 'project-hints':
          // These are informational hints, don't auto-apply
          this.logger.debug(`Info hint type ${hint.hintType} - not auto-applied`);
          break;

        default:
          this.logger.warn(`Unknown hint type for auto-apply: ${hint.hintType}`);
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

