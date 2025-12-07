import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import { WebContentAgent } from './web-content.agent';
import { ContentSummarizerAgent } from './content-summarizer.agent';
import { TaskAnalyzerAgent } from './task-analyzer.agent';
import { ContextExtractorAgent } from './context-extractor.agent';
import { ActionExtractorAgent } from './action-extractor.agent';
import { ToMarkdownAgent } from './to-markdown.agent';
import { AgentSelectorAgent } from './agent-selector.agent';
import { TaskHelpAgent } from './task-help.agent';
import {
    IEventBus,
    AgentProgressEvent,
    AgentCompletedEvent,
    TaskId,
    BoardId,
} from '@personal-kanban/shared';
import type {
    AgentProcessingResult,
    AgentProcessingProgress,
    AgentProgressCallback,
    WebContentResult,
    SummarizationResult,
    TaskAnalysisResult,
    ContextExtractionResult,
    ActionExtractionResult,
    TaskHelpResult,
    MarkdownFormatResult,
} from './types';
import type { ActionItem } from './action-extractor.agent';

/**
 * Agent Orchestrator
 * Coordinates multiple specialized agents to process tasks
 * Uses AI to intelligently decide which agents to run based on task content
 * Only runs agents that are relevant for the specific task
 * Creates hints from agent results that are attached to tasks
 */
@Injectable()
export class AgentOrchestrator {
    private readonly logger = new Logger(AgentOrchestrator.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
        private readonly webContentAgent: WebContentAgent,
        private readonly contentSummarizerAgent: ContentSummarizerAgent,
        private readonly taskAnalyzerAgent: TaskAnalyzerAgent,
        private readonly contextExtractorAgent: ContextExtractorAgent,
        private readonly actionExtractorAgent: ActionExtractorAgent,
        private readonly toMarkdownAgent: ToMarkdownAgent,
        private readonly agentSelectorAgent: AgentSelectorAgent,
        private readonly taskHelpAgent: TaskHelpAgent,
    ) {}

    /**
     * Process a task with multiple agents
     * Uses AI to determine which agents are relevant, then runs only selected agents
     * Creates hints from all successful agent results
     */
    async processTask(
        taskId: string,
        options?: {
            forceReprocess?: boolean;
            skipWebContent?: boolean;
            skipSummarization?: boolean;
            onProgress?: AgentProgressCallback;
        },
    ): Promise<AgentProcessingResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const progressHistory: AgentProcessingProgress[] = [];
        const onProgress = options?.onProgress;

        // Will be set after task is fetched
        let taskIdVO: TaskId | null = null;
        let boardIdVO: BoardId | null = null;

        // Helper to emit progress updates (both callback and event)
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
            progressHistory.push(progressUpdate);

            // Publish domain event for progress (if taskId and boardId are available)
            if (taskIdVO && boardIdVO) {
                try {
                    await this.eventBus.publish(
                        new AgentProgressEvent(
                            taskIdVO,
                            boardIdVO,
                            stage,
                            progress,
                            message,
                            details as Record<string, unknown> | undefined,
                        ),
                    );
                } catch (error) {
                    this.logger.warn('Failed to publish progress event', error);
                }
            }

            // Also call callback if provided (for backward compatibility)
            if (onProgress) {
                try {
                    await onProgress(progressUpdate);
                } catch (callbackError) {
                    this.logger.warn('Progress callback failed', callbackError);
                }
            }
        };

        try {
            // Fetch the task first to get boardId for events
            const task = await this.prisma.task.findUnique({
                where: { id: taskId },
                select: { id: true, boardId: true, title: true, description: true, metadata: true },
            });

            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            taskIdVO = TaskId.from(taskId);
            boardIdVO = BoardId.from(task.boardId);

            await emitProgress('initializing', 0, 'Starting agent processing...');

            this.logger.log(`Processing task ${taskId} with multiple agents`);

            const originalText = `${task.title}${task.description ? `\n\n${task.description}` : ''}`;
            const metadata = (task.metadata || {}) as Record<string, unknown>;

            // Step 1: AI decides which agents to use based on task content
            await emitProgress(
                'initializing',
                5,
                'Analyzing task to determine which agents to use...',
            );

            // First check for URL to inform agent selection
            let url: string | undefined;
            if (!options?.skipWebContent) {
                const extractedUrl = this.webContentAgent.extractUrl(originalText, metadata);
                url = extractedUrl || undefined;
            }

            // Use AI to select which agents to use
            const agentSelection = await this.agentSelectorAgent.selectAgents(
                task.title,
                task.description || undefined,
                !!url,
                undefined, // Will update after download
            );

            this.logger.log(
                `Agent selection: WebContent=${agentSelection.shouldUseWebContent}, ` +
                    `Summarization=${agentSelection.shouldUseSummarization}, ` +
                    `TaskAnalysis=${agentSelection.shouldUseTaskAnalysis}, ` +
                    `ContextExtraction=${agentSelection.shouldUseContextExtraction}, ` +
                    `ActionExtraction=${agentSelection.shouldUseActionExtraction} ` +
                    `(reasoning: ${agentSelection.reasoning})`,
            );

            await emitProgress('initializing', 10, `Selected agents: ${agentSelection.reasoning}`, {
                selectedAgents: {
                    webContent: agentSelection.shouldUseWebContent,
                    summarization: agentSelection.shouldUseSummarization,
                    taskAnalysis: agentSelection.shouldUseTaskAnalysis,
                    contextExtraction: agentSelection.shouldUseContextExtraction,
                    actionExtraction: agentSelection.shouldUseActionExtraction,
                },
                confidence: agentSelection.confidence,
            });

            // Step 2: Download web content if selected and URL is present
            let webContent: WebContentResult | undefined;

            if (agentSelection.shouldUseWebContent && !options?.skipWebContent && url) {
                await emitProgress('detecting-url', 15, 'Detecting URLs in task...');
                await emitProgress('downloading-content', 20, `Downloading content from: ${url}`, {
                    url,
                });
                this.logger.log(`Found URL in task: ${url}`);

                webContent = await this.webContentAgent.downloadContent(url);

                if (webContent.success) {
                    await emitProgress(
                        'extracting-text',
                        30,
                        `Content downloaded (${webContent.textContent?.length || 0} characters)`,
                        {
                            url,
                            contentLength: webContent.textContent?.length || 0,
                            title: webContent.title,
                        },
                    );

                    // Re-evaluate summarization need now that we know content length
                    if (agentSelection.shouldUseSummarization && webContent.textContent) {
                        const contentLength = webContent.textContent.length;
                        if (contentLength > 500) {
                            // Content is long enough to summarize
                        } else {
                            // Content is short, skip summarization
                            this.logger.log(
                                `Skipping summarization - content is short (${contentLength} chars)`,
                            );
                        }
                    }
                } else {
                    errors.push(`Web content download failed: ${webContent.error}`);
                    await emitProgress(
                        'error',
                        30,
                        `Failed to download content: ${webContent.error}`,
                        { url, error: webContent.error },
                    );
                    this.logger.warn(`Failed to download content from ${url}: ${webContent.error}`);
                }
            } else if (url && !agentSelection.shouldUseWebContent) {
                this.logger.log('Skipping web content download - not selected by AI');
            } else if (!url) {
                await emitProgress('detecting-url', 15, 'No URLs found in task');
            }

            // Step 3: Summarize downloaded content if selected
            let summarization: SummarizationResult | undefined;

            if (
                agentSelection.shouldUseSummarization &&
                !options?.skipSummarization &&
                webContent?.success &&
                webContent.textContent &&
                webContent.textContent.length > 500
            ) {
                await emitProgress(
                    'summarizing-content',
                    40,
                    `Summarizing content (${webContent.textContent.length} characters)...`,
                    { contentLength: webContent.textContent.length },
                );
                this.logger.log(
                    `Summarizing downloaded content (${webContent.textContent.length} chars)`,
                );

                summarization = await this.contentSummarizerAgent.summarize(
                    webContent.textContent,
                    500, // Target 500 words
                    task.title,
                    task.description || undefined,
                );

                if (summarization.success) {
                    await emitProgress(
                        'summarizing-content',
                        50,
                        `Content summarized (${summarization.wordCount || 0} words)`,
                        {
                            summaryLength: summarization.wordCount,
                            keyPoints: summarization.keyPoints?.length || 0,
                        },
                    );
                } else {
                    errors.push(`Content summarization failed: ${summarization.error}`);
                    await emitProgress(
                        'error',
                        50,
                        `Summarization failed: ${summarization.error}`,
                        { error: summarization.error },
                    );
                    this.logger.warn(`Failed to summarize content: ${summarization.error}`);
                }
            } else if (
                agentSelection.shouldUseSummarization &&
                webContent?.textContent &&
                webContent.textContent.length <= 500
            ) {
                this.logger.log('Skipping summarization - content is too short');
            } else if (!agentSelection.shouldUseSummarization) {
                this.logger.log('Skipping summarization - not selected by AI');
            }

            // Step 4: Extract actions early to steer other agents
            const contentSummary = summarization?.summary || webContent?.title || undefined;
            const enhancedDescription = task.description
                ? `${task.description}\n\n${contentSummary || ''}`.trim()
                : contentSummary;

            let actionExtraction: ActionExtractionResult | undefined;
            if (agentSelection.shouldUseActionExtraction) {
                await emitProgress('extracting-actions', 55, 'Extracting actions to guide analysis...', {
                    agentId: 'action-extractor-agent',
                });
                this.logger.log('Extracting actions early to steer other agents');

                actionExtraction = await this.actionExtractorAgent.extractActions(
                    task.title,
                    enhancedDescription,
                    contentSummary,
                );

                if (actionExtraction.success) {
                    await emitProgress(
                        'extracting-actions',
                        58,
                        `Extracted ${actionExtraction.totalActions || 0} actions`,
                        {
                            agentId: 'action-extractor-agent',
                            confidence: actionExtraction.confidence,
                            actionsCount: actionExtraction.totalActions || 0,
                        },
                    );
                    this.logger.log(
                        `Extracted ${actionExtraction.totalActions || 0} actions to guide other agents`,
                    );
                } else {
                    errors.push(`Action extraction failed: ${actionExtraction.error}`);
                    await emitProgress(
                        'error',
                        58,
                        `Action extraction failed: ${actionExtraction.error}`,
                        {
                            agentId: 'action-extractor-agent',
                            error: actionExtraction.error,
                        },
                    );
                    this.logger.warn(`Failed to extract actions: ${actionExtraction.error}`);
                }
            } else {
                this.logger.log('Skipping action extraction - not selected by AI');
            }

            // Step 5: Generate task help if we have web content (can use actions to guide)
            let taskHelp: TaskHelpResult | undefined;
            if (webContent?.success && (webContent.textContent || summarization?.summary)) {
                await emitProgress(
                    'generating-help',
                    60,
                    'Generating comprehensive help from content...',
                    {
                        agentId: 'task-help-agent',
                    },
                );
                this.logger.log('Generating task help from web content');

                taskHelp = await this.taskHelpAgent.generateHelp(
                    task.title,
                    task.description || undefined,
                    webContent.textContent,
                    summarization?.summary,
                    actionExtraction?.actions,
                );

                if (taskHelp.success) {
                    await emitProgress(
                        'generating-help',
                        63,
                        'Task help generated',
                        {
                            agentId: 'task-help-agent',
                            confidence: taskHelp.confidence,
                            helpTextLength: taskHelp.helpText?.length || 0,
                        },
                    );
                } else {
                    errors.push(`Task help generation failed: ${taskHelp.error}`);
                    await emitProgress(
                        'error',
                        63,
                        `Help generation failed: ${taskHelp.error}`,
                        {
                            agentId: 'task-help-agent',
                            error: taskHelp.error,
                        },
                    );
                    this.logger.warn(`Failed to generate task help: ${taskHelp.error}`);
                }
            }

            // Step 6: Run selected analysis agents in parallel (can use actions to guide)
            await emitProgress('analyzing-task', 65, 'Running selected AI agents...');
            this.logger.log(
                `Running parallel agent analysis (selected agents: TaskAnalysis=${agentSelection.shouldUseTaskAnalysis}, ContextExtraction=${agentSelection.shouldUseContextExtraction})...`,
            );

            // Build array of agent promises based on selection
            const agentPromises: Array<
                Promise<TaskAnalysisResult | ContextExtractionResult | undefined>
            > = [];
            const agentNames: string[] = [];

            if (agentSelection.shouldUseTaskAnalysis) {
                agentPromises.push(
                    this.taskAnalyzerAgent
                        .analyzeTask(
                            task.title,
                            enhancedDescription,
                            contentSummary,
                            actionExtraction?.actions,
                        )
                        .then(async (result) => {
                            if (result?.success) {
                                await emitProgress(
                                    'analyzing-task',
                                    75,
                                    'Task analysis completed',
                                    {
                                        agentId: 'task-analyzer-agent',
                                        confidence: result.confidence,
                                    },
                                );
                            }
                            return result;
                        })
                        .catch(async (err) => {
                            errors.push(`Task analysis failed: ${err.message}`);
                            await emitProgress(
                                'error',
                                75,
                                `Task analysis failed: ${err.message}`,
                                {
                                    agentId: 'task-analyzer-agent',
                                    error: err.message,
                                },
                            );
                            return undefined;
                        }),
                );
                agentNames.push('taskAnalysis');
            } else {
                this.logger.log('Skipping task analysis - not selected by AI');
                agentPromises.push(Promise.resolve(undefined));
                agentNames.push('taskAnalysis');
            }

            if (agentSelection.shouldUseContextExtraction) {
                agentPromises.push(
                    this.contextExtractorAgent
                        .extractContext(
                            task.title,
                            enhancedDescription,
                            contentSummary,
                            actionExtraction?.actions,
                        )
                        .then(async (result) => {
                            if (result?.success) {
                                await emitProgress(
                                    'extracting-context',
                                    85,
                                    'Context extraction completed',
                                    {
                                        agentId: 'context-extractor-agent',
                                        confidence: result.confidence,
                                        tagsCount: result.tags?.length || 0,
                                    },
                                );
                            }
                            return result;
                        })
                        .catch(async (err) => {
                            errors.push(`Context extraction failed: ${err.message}`);
                            await emitProgress(
                                'error',
                                85,
                                `Context extraction failed: ${err.message}`,
                                {
                                    agentId: 'context-extractor-agent',
                                    error: err.message,
                                },
                            );
                            return undefined;
                        }),
                );
                agentNames.push('contextExtraction');
            } else {
                this.logger.log('Skipping context extraction - not selected by AI');
                agentPromises.push(Promise.resolve(undefined));
                agentNames.push('contextExtraction');
            }

            // Run selected agents in parallel with timeout protection
            // Use Promise.allSettled for better error isolation
            const results = await Promise.allSettled(agentPromises).then((settledResults) =>
                settledResults.map((result) => {
                    if (result.status === 'fulfilled') {
                        return result.value;
                    }
                    const errorMessage =
                        result.reason instanceof Error
                            ? result.reason.message
                            : String(result.reason);
                    errors.push(`Agent execution failed: ${errorMessage}`);
                    this.logger.error('Agent promise rejected', result.reason);
                    return undefined;
                }),
            );

            // Map results to variables - results array has 2 elements in order: taskAnalysis, contextExtraction
            const taskAnalysis = results[0];
            const contextExtraction = results[1];

            // Note: Markdown conversion is done AFTER hints are auto-applied (in task-processor.service.ts)
            // This ensures markdown conversion uses the final description after high-confidence hints are applied

            const processingTimeMs = Date.now() - startTime;

            const successfulAgents = Object.values({
                webContent,
                summarization,
                taskHelp,
                taskAnalysis,
                contextExtraction,
                actionExtraction,
            }).filter((v) => v && typeof v === 'object' && 'success' in v && v.success).length;

            await emitProgress('completed', 100, 'Agent processing completed', {
                processingTimeMs,
                errorsCount: errors.length,
                successfulAgents,
                selectedAgents: {
                    webContent: agentSelection.shouldUseWebContent,
                    summarization: agentSelection.shouldUseSummarization,
                    taskAnalysis: agentSelection.shouldUseTaskAnalysis,
                    contextExtraction: agentSelection.shouldUseContextExtraction,
                    actionExtraction: agentSelection.shouldUseActionExtraction,
                },
                agentSelectionReasoning: agentSelection.reasoning,
            });

            const result: AgentProcessingResult = {
                taskId,
                originalText,
                url,
                webContent,
                summarization,
                taskHelp,
                taskAnalysis,
                contextExtraction,
                actionExtraction,
                // markdownFormat is set later after hints are auto-applied
                markdownFormat: undefined,
                processingTimeMs,
                errors: errors.length > 0 ? errors : undefined,
                progress: progressHistory,
            };

            this.logger.log(
                `Task ${taskId} processed in ${processingTimeMs}ms ` +
                    `(${errors.length} errors, ${Object.values(result).filter((v) => v && typeof v === 'object' && 'success' in v && v.success).length} successful agents)`,
            );

            // Publish completion event
            if (taskIdVO && boardIdVO) {
                try {
                    await this.eventBus.publish(
                        new AgentCompletedEvent(
                            taskIdVO,
                            boardIdVO,
                            processingTimeMs,
                            successfulAgents,
                            errors.length > 0 ? errors : undefined,
                        ),
                    );
                } catch (error) {
                    this.logger.warn('Failed to publish completion event', error);
                }
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error processing task ${taskId}: ${errorMessage}`);

            await emitProgress('error', 0, `Processing failed: ${errorMessage}`, {
                error: errorMessage,
            });

            return {
                taskId,
                originalText: '',
                processingTimeMs: Date.now() - startTime,
                errors: [errorMessage],
                progress: progressHistory,
            };
        }
    }

}
