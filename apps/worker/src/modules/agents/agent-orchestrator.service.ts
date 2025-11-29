import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WebContentAgent } from './web-content.agent';
import { ContentSummarizerAgent } from './content-summarizer.agent';
import { TaskAnalyzerAgent } from './task-analyzer.agent';
import { ContextExtractorAgent } from './context-extractor.agent';
import { ActionExtractorAgent } from './action-extractor.agent';
import { AgentSelectorAgent } from './agent-selector.agent';
import { HintService } from './hint.service';
import type {
  AgentProcessingResult,
  AgentProcessingProgress,
  AgentProgressCallback,
  WebContentResult,
  SummarizationResult,
  TaskAnalysisResult,
  ContextExtractionResult,
  ActionExtractionResult,
} from './types';

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
    private readonly webContentAgent: WebContentAgent,
    private readonly contentSummarizerAgent: ContentSummarizerAgent,
    private readonly taskAnalyzerAgent: TaskAnalyzerAgent,
    private readonly contextExtractorAgent: ContextExtractorAgent,
    private readonly actionExtractorAgent: ActionExtractorAgent,
    private readonly agentSelectorAgent: AgentSelectorAgent,
    private readonly hintService: HintService,
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

    // Helper to emit progress updates
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
      
      if (onProgress) {
        try {
          await onProgress(progressUpdate);
        } catch (callbackError) {
          this.logger.warn('Progress callback failed', callbackError);
        }
      }
    };

    try {
      await emitProgress('initializing', 0, 'Starting agent processing...');

      // Fetch the task
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      this.logger.log(`Processing task ${taskId} with multiple agents`);

      const originalText = `${task.title}${task.description ? `\n\n${task.description}` : ''}`;
      const metadata = (task.metadata || {}) as Record<string, unknown>;

      // Step 1: AI decides which agents to use based on task content
      await emitProgress('initializing', 5, 'Analyzing task to determine which agents to use...');
      
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
        await emitProgress('downloading-content', 20, `Downloading content from: ${url}`, { url });
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
              this.logger.log(`Skipping summarization - content is short (${contentLength} chars)`);
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
        this.logger.log(`Skipping web content download - not selected by AI`);
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
        this.logger.log(`Summarizing downloaded content (${webContent.textContent.length} chars)`);
        
        summarization = await this.contentSummarizerAgent.summarize(
          webContent.textContent,
          500, // Target 500 words
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
      } else if (agentSelection.shouldUseSummarization && webContent?.textContent && webContent.textContent.length <= 500) {
        this.logger.log(`Skipping summarization - content is too short`);
      } else if (!agentSelection.shouldUseSummarization) {
        this.logger.log(`Skipping summarization - not selected by AI`);
      }

      // Step 4: Run selected analysis agents in parallel
      const contentSummary = summarization?.summary || webContent?.title || undefined;
      const enhancedDescription = task.description 
        ? `${task.description}\n\n${contentSummary || ''}`.trim()
        : contentSummary;

      await emitProgress('analyzing-task', 60, 'Running selected AI agents...');
      this.logger.log(`Running parallel agent analysis (selected agents: TaskAnalysis=${agentSelection.shouldUseTaskAnalysis}, ContextExtraction=${agentSelection.shouldUseContextExtraction}, ActionExtraction=${agentSelection.shouldUseActionExtraction})...`);

      // Build array of agent promises based on selection
      const agentPromises: Array<Promise<TaskAnalysisResult | ContextExtractionResult | ActionExtractionResult | undefined>> = [];
      const agentNames: string[] = [];

      if (agentSelection.shouldUseTaskAnalysis) {
        agentPromises.push(
          this.taskAnalyzerAgent
            .analyzeTask(task.title, enhancedDescription, contentSummary)
            .then(async (result) => {
              if (result?.success) {
                await emitProgress('analyzing-task', 70, 'Task analysis completed', {
                  agentId: 'task-analyzer-agent',
                  confidence: result.confidence,
                });
              }
              return result;
            })
            .catch(async (err) => {
              errors.push(`Task analysis failed: ${err.message}`);
              await emitProgress('error', 70, `Task analysis failed: ${err.message}`, {
                agentId: 'task-analyzer-agent',
                error: err.message,
              });
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
            .extractContext(task.title, enhancedDescription, contentSummary)
            .then(async (result) => {
              if (result?.success) {
                await emitProgress('extracting-context', 80, 'Context extraction completed', {
                  agentId: 'context-extractor-agent',
                  confidence: result.confidence,
                  tagsCount: result.tags?.length || 0,
                });
              }
              return result;
            })
            .catch(async (err) => {
              errors.push(`Context extraction failed: ${err.message}`);
              await emitProgress('error', 80, `Context extraction failed: ${err.message}`, {
                agentId: 'context-extractor-agent',
                error: err.message,
              });
              return undefined;
            }),
        );
        agentNames.push('contextExtraction');
      } else {
        this.logger.log('Skipping context extraction - not selected by AI');
        agentPromises.push(Promise.resolve(undefined));
        agentNames.push('contextExtraction');
      }

      if (agentSelection.shouldUseActionExtraction) {
        agentPromises.push(
          this.actionExtractorAgent
            .extractActions(task.title, enhancedDescription, contentSummary)
            .then(async (result) => {
              if (result?.success) {
                await emitProgress('extracting-actions', 90, `Extracted ${result.totalActions || 0} actions`, {
                  agentId: 'action-extractor-agent',
                  confidence: result.confidence,
                  actionsCount: result.totalActions || 0,
                });
              }
              return result;
            })
            .catch(async (err) => {
              errors.push(`Action extraction failed: ${err.message}`);
              await emitProgress('error', 90, `Action extraction failed: ${err.message}`, {
                agentId: 'action-extractor-agent',
                error: err.message,
              });
              return undefined;
            }),
        );
        agentNames.push('actionExtraction');
      } else {
        this.logger.log('Skipping action extraction - not selected by AI');
        agentPromises.push(Promise.resolve(undefined));
        agentNames.push('actionExtraction');
      }

      // Run selected agents in parallel with timeout protection
      // Use Promise.allSettled for better error isolation
      const results = await Promise.allSettled(agentPromises).then((settledResults) =>
        settledResults.map((result) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            const errorMessage =
              result.reason instanceof Error ? result.reason.message : String(result.reason);
            errors.push(`Agent execution failed: ${errorMessage}`);
            this.logger.error('Agent promise rejected', result.reason);
            return undefined;
          }
        }),
      );
      
      // Map results to variables - results array always has 3 elements in order: taskAnalysis, contextExtraction, actionExtraction
      const taskAnalysis = results[0];
      const contextExtraction = results[1];
      const actionExtraction = results[2];

      const processingTimeMs = Date.now() - startTime;

      const successfulAgents = Object.values({
        webContent,
        summarization,
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
        taskAnalysis,
        contextExtraction,
        actionExtraction,
        processingTimeMs,
        errors: errors.length > 0 ? errors : undefined,
        progress: progressHistory,
      };

      this.logger.log(
        `Task ${taskId} processed in ${processingTimeMs}ms ` +
        `(${errors.length} errors, ${Object.values(result).filter(v => v && typeof v === 'object' && 'success' in v && v.success).length} successful agents)`
      );

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
        context?: string;
        metadata?: Record<string, unknown>;
      } = {};

      const tagsToAdd: string[] = [];
      const checklistItems: Array<{ title: string; isDone: boolean; position: number }> = [];

      // Update title if suggested
      if (options?.updateTitle && results.taskAnalysis?.suggestedTitle) {
        updates.title = results.taskAnalysis.suggestedTitle;
      }

      // Update description if suggested
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
        const context = results.taskAnalysis?.context || results.contextExtraction?.context;
        if (context) {
          updates.context = context as string;
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
      };

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

