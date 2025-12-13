import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import { Prisma, TaskContext } from '@prisma/client';
import { HintService } from './hint.service';
import {
    AgentProcessingProgress,
    AgentProcessingResult,
    AgentProgressCallback,
} from './types';

/**
 * Agent Application Service
 * Handles applying agent results to tasks
 * Separated from orchestration to maintain clear responsibilities
 */
@Injectable()
export class AgentApplicationService {
    private readonly logger = new Logger(AgentApplicationService.name);

    constructor(
        private readonly prisma: PrismaService,
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
            stage: AgentProcessingProgress['stage'],
            progress: number,
            message: string,
            details?: AgentProcessingProgress['details'],
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
                    this.logger.warn('Progress callback failed during apply', callbackError);
                }
            }
        };

        try {
            await emitProgress('applying-results', 0, 'Creating hints from agent results...');

            // Create hints from all agent results first
            await this.hintService.createHintsFromResults(taskId, results);

            await emitProgress('applying-results', 20, 'Applying selected hints to task...');

            const task = await this.prisma.task.findUnique({
                where: { id: taskId },
                include: { checklist: true, hints: true },
            });

            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            const updates: {
                title?: string;
                description?: string;
                context?: TaskContext;
                metadata?: Prisma.InputJsonValue;
            } = {};

            const tagsToAdd: string[] = [];
            const checklistItems: Array<{ title: string; isDone: boolean; position: number }> = [];

            // Update title if suggested
            if (options?.updateTitle && results.taskAnalysis?.suggestedTitle) {
                updates.title = results.taskAnalysis.suggestedTitle;
            }

            // Update description if suggested
            // Note: Markdown conversion happens AFTER hints are auto-applied (in task-processor.service.ts)
            // So we don't apply markdown here - it's already been applied
            if (options?.updateDescription) {
                const suggestedDesc = results.taskAnalysis?.suggestedDescription;
                const summary = results.summarization?.summary;
                const currentDesc = task.description || '';

                if (suggestedDesc || summary) {
                    const parts = [
                        currentDesc,
                        suggestedDesc,
                        summary && summary !== suggestedDesc ? `\n\n[Summary]\n${summary}` : null,
                    ].filter(Boolean);

                    updates.description = parts.join('\n\n').trim();
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
            if (options?.addChecklistFromActions && results.actionExtraction?.actions) {
                const existingCount = task.checklist.length;
                results.actionExtraction.actions.forEach((action, index) => {
                    checklistItems.push({
                        title: action.description,
                        isDone: false,
                        position: existingCount + index,
                    });
                });
            }

            // Store minimal metadata (processing info, not the full results)
            // Hints are created separately at the beginning of this method
            const existingMetadata = (task.metadata || {}) as Record<string, unknown>;
            updates.metadata = {
                ...existingMetadata,
                agentProcessing: {
                    processedAt: new Date().toISOString(),
                    processingTimeMs: results.processingTimeMs,
                    url: results.url,
                    hintCount: await this.prisma.hint.count({ where: { taskId } }),
                    errors: results.errors,
                },
            } as Prisma.InputJsonValue;

            // Apply updates in a transaction
            await emitProgress('applying-results', 50, 'Saving updates to task...');

            await this.prisma.$transaction(async (tx) => {
                if (Object.keys(updates).length > 0) {
                    await tx.task.update({
                        where: { id: taskId },
                        data: updates,
                    });
                }

                // Add checklist items if any
                if (checklistItems.length > 0) {
                    await tx.checklistItem.createMany({
                        data: checklistItems.map((item) => ({
                            taskId,
                            ...item,
                        })),
                    });
                }
            });

            await emitProgress('applying-results', 100, 'Results applied successfully', {
                checklistItemsAdded: checklistItems.length,
                tagsToAdd: tagsToAdd.length,
            });

            this.logger.log(`Applied agent results to task ${taskId}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error applying results to task ${taskId}: ${errorMessage}`);
            throw error;
        }
    }
}
