import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@personal-kanban/shared";
import {
  AgentCompletedEvent,
  AgentProgressEvent,
  BoardId,
  type IEventBus,
  TaskId,
} from "@personal-kanban/shared";
import { ActionExtractorAgent } from "../agents/action-extractor.agent";
import {
  AgentSelectorAgent,
  type AgentSelectionResult,
} from "../agents/agent-selector.agent";
import { ContentSummarizerAgent } from "../agents/content-summarizer.agent";
import { ContextExtractorAgent } from "../agents/context-extractor.agent";
import { TaskAnalyzerAgent } from "../agents/task-analyzer.agent";
import { TaskAssistantAgent } from "../agents/task-assistant.agent";
import { WebContentAgent } from "../agents/web-content.agent";
import {
  ActionExtractionResult,
  AgentProcessingProgress,
  AgentProcessingResult,
  AgentProgressCallback,
  ContextExtractionResult,
  SummarizationResult,
  TaskAnalysisResult,
  TaskAssistantResult,
  WebContentResult,
} from "../types/types";

/**
 * Local brain structure containing all gathered context for analysis
 */
interface LocalBrain {
  title: string;
  description?: string;
  originalDescription?: string;
  webContent?: string;
  contentSummary?: string;
  webContentTitle?: string;
  url?: string;
}

/**
 * Task data fetched from database
 */
interface TaskData {
  id: string;
  boardId: string;
  title: string;
  description: string | null;
  metadata: unknown;
}

/**
 * Processing context passed between phases
 */
interface ProcessingContext {
  taskId: string;
  task: TaskData;
  taskIdVO: TaskId;
  boardIdVO: BoardId;
  originalText: string;
  metadata: Record<string, unknown>;
  errors: string[];
  progressHistory: AgentProcessingProgress[];
  startTime: number;
}

/**
 * Progress tracker helper class with automatic incremental progress
 */
class ProgressTracker {
  private readonly progressHistory: AgentProcessingProgress[];
  private currentProgress = 0;
  private readonly increment = 5;

  constructor(
    private readonly taskId: string,
    private readonly taskIdVO: TaskId | null,
    private readonly boardIdVO: BoardId | null,
    private readonly eventBus: IEventBus,
    private readonly logger: Logger,
    private readonly onProgress?: AgentProgressCallback,
    progressHistory: AgentProcessingProgress[] = [],
  ) {
    this.progressHistory = progressHistory;
  }

  /**
   * Emit progress with automatic incremental value
   */
  async emit(
    stage: AgentProcessingProgress["stage"],
    message: string,
    details?: AgentProcessingProgress["details"],
  ): Promise<void> {
    // Auto-increment progress
    this.currentProgress = Math.min(this.currentProgress + this.increment, 100);
    const progress = this.currentProgress;

    const progressUpdate: AgentProcessingProgress = {
      taskId: this.taskId,
      stage,
      progress,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    this.progressHistory.push(progressUpdate);

    // Publish domain event for progress
    if (this.taskIdVO && this.boardIdVO) {
      try {
        await this.eventBus.publish(
          new AgentProgressEvent(
            this.taskIdVO,
            this.boardIdVO,
            stage,
            progress,
            message,
            details as Record<string, unknown> | undefined,
          ),
        );
      } catch (error) {
        this.logger.warn("Failed to publish progress event", error);
      }
    }

    // Call callback if provided
    if (this.onProgress) {
      try {
        await this.onProgress(progressUpdate);
      } catch (callbackError) {
        this.logger.warn("Progress callback failed", callbackError);
      }
    }
  }

  /**
   * Set progress to a specific value (for milestones like 0 and 100)
   */
  setProgress(value: number): void {
    this.currentProgress = Math.min(Math.max(value, 0), 100);
  }

  getHistory(): AgentProcessingProgress[] {
    return this.progressHistory;
  }
}

/**
 * Agent Orchestrator
 * Coordinates specialized agents to PREPARE work tasks for human execution
 *
 * Core Purpose: Help humans prepare for work by:
 * 1. Pre-analyzing tasks to understand what needs to be done
 * 2. Downloading and summarizing web content for context
 * 3. Categorizing and organizing tasks (context, tags, metadata)
 * 4. Extracting actionable steps to break down complex work
 * 5. Preparing clear, executable work descriptions
 *
 * IMPORTANT: Clear three-phase order:
 *
 * Phase 1 - BUILD LOCAL BRAIN (Gather all data):
 * 1. Web Content Agent: Downloads websites/URLs mentioned in tasks
 * 2. Content Summarizer Agent: Summarizes downloaded content for quick understanding
 * 3. Build "local brain": Accumulate all gathered data (title, description, web content, summaries)
 *
 * Phase 2 - PERFORM ANALYSIS (Work on local brain):
 * All agents run in parallel on the complete local brain:
 * - Task Analyzer Agent: Pre-analyzes task to extract metadata and improve descriptions
 * - Context Extractor Agent: Categorizes tasks with context, tags, and project hints
 * - Action Extractor Agent: Breaks down tasks into actionable checklist items and proposes solutions
 *
 * Phase 3 - EXECUTE ACTIONS (Run actions with local brain and LLM):
 * Execute the extracted actions using the local brain context and LLM:
 * - Task Assistant Agent: Uses LLM to work through each extracted action
 * - Generates implementations, results, or detailed guidance for each action
 * - Uses the complete local brain (web content, summaries, context) to execute actions intelligently
 *
 * This ensures all analysis happens on complete context, not partial data.
 * Actions are then executed using the accumulated knowledge for maximum effectiveness.
 */
@Injectable()
export class AgentOrchestrator {
  private readonly logger = new Logger(AgentOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
    private readonly webContentAgent: WebContentAgent,
    private readonly contentSummarizerAgent: ContentSummarizerAgent,
    private readonly taskAnalyzerAgent: TaskAnalyzerAgent,
    private readonly contextExtractorAgent: ContextExtractorAgent,
    private readonly actionExtractorAgent: ActionExtractorAgent,
    private readonly agentSelectorAgent: AgentSelectorAgent,
    private readonly taskAssistantAgent: TaskAssistantAgent,
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

    try {
      // Phase 0: Initialize and fetch task
      const context = await this.initializeProcessing(
        taskId,
        errors,
        progressHistory,
        options?.onProgress,
      );

      const progress = new ProgressTracker(
        taskId,
        context.taskIdVO,
        context.boardIdVO,
        this.eventBus,
        this.logger,
        options?.onProgress,
        progressHistory,
      );

      progress.setProgress(0);
      await progress.emit("initializing", "Starting agent processing...");
      this.logger.log(`Processing task ${taskId} with multiple agents`);

      // Phase 1: Build local brain (gather all data)
      const { url, webContent, summarization, localBrain, agentSelection } =
        await this.buildLocalBrain(context, progress, options);

      // Phase 2: Perform analysis on local brain
      const { taskAnalysis, contextExtraction, actionExtraction } =
        await this.runAnalysisAgents(
          context,
          progress,
          localBrain,
          agentSelection,
          errors,
        );

      // Phase 3: Execute actions using local brain and LLM
      const taskAssistant = await this.executeActions(
        context,
        progress,
        localBrain,
        actionExtraction,
        errors,
      );

      // Build final result
      const processingTimeMs = Date.now() - startTime;
      const result = this.buildResult(
        context,
        url,
        webContent,
        summarization,
        taskAnalysis,
        contextExtraction,
        actionExtraction,
        taskAssistant,
        processingTimeMs,
        errors,
        progressHistory,
        agentSelection,
      );

      await this.finalizeProcessing(
        context,
        progress,
        result,
        processingTimeMs,
        errors,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Error processing task ${taskId}: ${errorMessage}`);

      const progress = new ProgressTracker(
        taskId,
        null,
        null,
        this.eventBus,
        this.logger,
        options?.onProgress,
        progressHistory,
      );

      progress.setProgress(0);
      await progress.emit("error", `Processing failed: ${errorMessage}`, {
        error: errorMessage,
      });

      return {
        taskId,
        originalText: "",
        processingTimeMs: Date.now() - startTime,
        errors: [errorMessage],
        progress: progressHistory,
      };
    }
  }

  /**
   * Initialize processing by fetching task and setting up context
   */
  private async initializeProcessing(
    taskId: string,
    errors: string[],
    progressHistory: AgentProcessingProgress[],
    _onProgress?: AgentProgressCallback,
  ): Promise<ProcessingContext> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        boardId: true,
        title: true,
        description: true,
        metadata: true,
      },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const taskIdVO = TaskId.from(taskId);
    const boardIdVO = BoardId.from(task.boardId);
    const originalText = `${task.title}${task.description ? `\n\n${task.description}` : ""}`;
    const metadata = (task.metadata || {}) as Record<string, unknown>;

    return {
      taskId,
      task,
      taskIdVO,
      boardIdVO,
      originalText,
      metadata,
      errors,
      progressHistory,
      startTime: Date.now(),
    };
  }

  /**
   * Phase 1: Build local brain by gathering all available data
   */
  private async buildLocalBrain(
    context: ProcessingContext,
    progress: ProgressTracker,
    options?: {
      skipWebContent?: boolean;
      skipSummarization?: boolean;
    },
  ): Promise<{
    url?: string;
    webContent?: WebContentResult;
    summarization?: SummarizationResult;
    localBrain: LocalBrain;
    agentSelection: AgentSelectionResult;
  }> {
    // Step 1: Select agents
    await progress.emit(
      "initializing",
      "Analyzing task to determine which agents to use...",
    );

    let url: string | undefined;
    if (!options?.skipWebContent) {
      const extractedUrl = this.webContentAgent.extractUrl(
        context.originalText,
        context.metadata,
      );
      url = extractedUrl || undefined;
    }

    const agentSelection = await this.agentSelectorAgent.selectAgents(
      context.task.title,
      context.task.description || undefined,
      !!url,
      undefined,
    );

    this.logAgentSelection(agentSelection);

    await progress.emit(
      "initializing",
      `Selected agents: ${agentSelection.reasoning}`,
      {
        selectedAgents: {
          webContent: agentSelection.shouldUseWebContent,
          summarization: agentSelection.shouldUseSummarization,
          taskAnalysis: agentSelection.shouldUseTaskAnalysis,
          contextExtraction: agentSelection.shouldUseContextExtraction,
          actionExtraction: agentSelection.shouldUseActionExtraction,
        },
        confidence: agentSelection.confidence,
      },
    );

    // Step 2: Download web content
    const webContent = await this.downloadWebContent(
      context,
      progress,
      agentSelection,
      url,
      options?.skipWebContent,
    );

    // Step 3: Summarize content
    const summarization = await this.summarizeContent(
      context,
      progress,
      agentSelection,
      webContent,
      options?.skipSummarization,
    );

    // Step 4: Build local brain
    const localBrain = this.createLocalBrain(
      context.task,
      url,
      webContent,
      summarization,
    );

    this.logger.log(
      `Built local brain with context: title=${localBrain.title}, description=${localBrain.description?.length || 0} chars, webContent=${localBrain.webContent?.length || 0} chars, summary=${localBrain.contentSummary?.length || 0} chars`,
    );

    await progress.emit(
      "building-context",
      "Local brain built - all available data gathered and ready for analysis",
      {
        hasWebContent: !!localBrain.webContent,
        hasSummary: !!localBrain.contentSummary,
        totalContextChars:
          (localBrain.description?.length || 0) +
          (localBrain.webContent?.length || 0),
      },
    );

    return {
      url,
      webContent,
      summarization,
      localBrain,
      agentSelection,
    };
  }

  /**
   * Download web content if needed
   */
  private async downloadWebContent(
    context: ProcessingContext,
    progress: ProgressTracker,
    agentSelection: AgentSelectionResult,
    url: string | undefined,
    skipWebContent?: boolean,
  ): Promise<WebContentResult | undefined> {
    if (!agentSelection.shouldUseWebContent || skipWebContent || !url) {
      if (url && !agentSelection.shouldUseWebContent) {
        this.logger.log("Skipping web content download - not selected by AI");
      } else if (!url) {
        await progress.emit("detecting-url", "No URLs found in task");
      }
      return undefined;
    }

    await progress.emit("detecting-url", "Detecting URLs in task...");
    await progress.emit(
      "downloading-content",
      `Downloading content from: ${url}`,
      { url },
    );
    this.logger.log(`Found URL in task: ${url}`);

    const webContent = await this.webContentAgent.downloadContent(url);

    if (webContent.success) {
      await progress.emit(
        "extracting-text",
        `Content downloaded (${webContent.textContent?.length || 0} characters)`,
        {
          url,
          contentLength: webContent.textContent?.length || 0,
          title: webContent.title,
        },
      );
    } else {
      context.errors.push(`Web content download failed: ${webContent.error}`);
      await progress.emit(
        "error",
        `Failed to download content: ${webContent.error}`,
        { url, error: webContent.error },
      );
      this.logger.warn(
        `Failed to download content from ${url}: ${webContent.error}`,
      );
    }

    return webContent;
  }

  /**
   * Summarize downloaded content if needed
   */
  private async summarizeContent(
    context: ProcessingContext,
    progress: ProgressTracker,
    agentSelection: AgentSelectionResult,
    webContent: WebContentResult | undefined,
    skipSummarization?: boolean,
  ): Promise<SummarizationResult | undefined> {
    const shouldSummarize =
      agentSelection.shouldUseSummarization ||
      (webContent?.textContent && webContent.textContent.length > 10000);

    if (
      skipSummarization ||
      !webContent?.success ||
      !webContent.textContent ||
      webContent.textContent.length <= 500 ||
      !shouldSummarize
    ) {
      if (
        agentSelection.shouldUseSummarization &&
        webContent?.textContent &&
        webContent.textContent.length <= 500
      ) {
        this.logger.log("Skipping summarization - content is too short");
      } else if (!agentSelection.shouldUseSummarization) {
        this.logger.log("Skipping summarization - not selected by AI");
      }
      return undefined;
    }

    await progress.emit(
      "summarizing-content",
      `Summarizing content (${webContent.textContent.length} characters)...`,
      { contentLength: webContent.textContent.length },
    );
    this.logger.log(
      `Summarizing downloaded content (${webContent.textContent.length} chars)`,
    );

    const summarization = await this.contentSummarizerAgent.summarize(
      webContent.textContent,
      500, // Target 500 words
      context.task.title,
      context.task.description || undefined,
    );

    if (summarization.success) {
      await progress.emit(
        "summarizing-content",
        `Content summarized (${summarization.wordCount || 0} words)`,
        {
          summaryLength: summarization.wordCount,
          keyPoints: summarization.keyPoints?.length || 0,
        },
      );
    } else {
      context.errors.push(
        `Content summarization failed: ${summarization.error}`,
      );
      await progress.emit(
        "error",
        `Summarization failed: ${summarization.error}`,
        { error: summarization.error },
      );
      this.logger.warn(`Failed to summarize content: ${summarization.error}`);
    }

    return summarization;
  }

  /**
   * Create local brain structure from gathered data
   */
  private createLocalBrain(
    task: TaskData,
    url: string | undefined,
    webContent: WebContentResult | undefined,
    summarization: SummarizationResult | undefined,
  ): LocalBrain {
    const contentSummary =
      summarization?.summary || webContent?.title || undefined;
    const enhancedDescription = task.description
      ? contentSummary
        ? `${task.description}\n\n[Context from ${url}]\n${contentSummary}`.trim()
        : task.description
      : contentSummary || undefined;

    return {
      title: task.title,
      description: enhancedDescription || task.description || undefined,
      originalDescription: task.description || undefined,
      webContent: webContent?.textContent,
      contentSummary: contentSummary,
      webContentTitle: webContent?.title,
      url: url,
    };
  }

  /**
   * Phase 2: Run analysis agents in parallel on local brain
   */
  private async runAnalysisAgents(
    context: ProcessingContext,
    progress: ProgressTracker,
    localBrain: LocalBrain,
    agentSelection: AgentSelectionResult,
    errors: string[],
  ): Promise<{
    taskAnalysis?: TaskAnalysisResult;
    contextExtraction?: ContextExtractionResult;
    actionExtraction?: ActionExtractionResult;
  }> {
    await progress.emit(
      "analyzing-task",
      "Running analysis agents on complete local brain...",
    );
    this.logger.log(
      `Running analysis agents on local brain (selected agents: TaskAnalysis=${agentSelection.shouldUseTaskAnalysis}, ContextExtraction=${agentSelection.shouldUseContextExtraction}, ActionExtraction=${agentSelection.shouldUseActionExtraction})...`,
    );

    const agentPromises = this.buildAgentPromises(
      context,
      progress,
      localBrain,
      agentSelection,
      errors,
    );

    const results = await Promise.allSettled(agentPromises).then(
      (settledResults) =>
        settledResults.map((result) => {
          if (result.status === "fulfilled") {
            return result.value;
          }
          const errorMessage =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          errors.push(`Agent execution failed: ${errorMessage}`);
          this.logger.error("Agent promise rejected", result.reason);
          return undefined;
        }),
    );

    const taskAnalysis = results[0] as TaskAnalysisResult | undefined;
    const contextExtraction = results[1] as ContextExtractionResult | undefined;
    const actionExtraction = results[2] as ActionExtractionResult | undefined;

    await progress.emit("analyzing-task", "Analysis completed on local brain", {
      taskAnalysis: taskAnalysis?.success,
      contextExtraction: contextExtraction?.success,
      actionExtraction: actionExtraction?.success,
      actionsExtracted: actionExtraction?.totalActions || 0,
      solutionsProposed: actionExtraction?.totalSolutions || 0,
    });

    return { taskAnalysis, contextExtraction, actionExtraction };
  }

  /**
   * Build promises for analysis agents based on selection
   */
  private buildAgentPromises(
    context: ProcessingContext,
    progress: ProgressTracker,
    localBrain: LocalBrain,
    agentSelection: AgentSelectionResult,
    errors: string[],
  ): Array<
    Promise<
      | TaskAnalysisResult
      | ContextExtractionResult
      | ActionExtractionResult
      | undefined
    >
  > {
    const promises: Array<
      Promise<
        | TaskAnalysisResult
        | ContextExtractionResult
        | ActionExtractionResult
        | undefined
      >
    > = [];

    // Task Analysis Agent
    if (agentSelection.shouldUseTaskAnalysis) {
      promises.push(
        this.runTaskAnalysisAgent(context, progress, localBrain, errors),
      );
    } else {
      this.logger.log("Skipping task analysis - not selected by AI");
      promises.push(Promise.resolve(undefined));
    }

    // Context Extraction Agent
    if (agentSelection.shouldUseContextExtraction) {
      promises.push(
        this.runContextExtractionAgent(context, progress, localBrain, errors),
      );
    } else {
      this.logger.log("Skipping context extraction - not selected by AI");
      promises.push(Promise.resolve(undefined));
    }

    // Action Extraction Agent
    if (agentSelection.shouldUseActionExtraction) {
      promises.push(
        this.runActionExtractionAgent(context, progress, localBrain, errors),
      );
    } else {
      this.logger.log("Skipping action extraction - not selected by AI");
      promises.push(Promise.resolve(undefined));
    }

    return promises;
  }

  /**
   * Run task analysis agent with error handling
   */
  private async runTaskAnalysisAgent(
    _context: ProcessingContext,
    progress: ProgressTracker,
    localBrain: LocalBrain,
    errors: string[],
  ): Promise<TaskAnalysisResult | undefined> {
    try {
      const result = await this.taskAnalyzerAgent.analyzeTask(
        localBrain.title,
        localBrain.description,
        localBrain.contentSummary,
        undefined,
      );

      if (result?.success) {
        await progress.emit("analyzing-task", "Task analysis completed", {
          agentId: "task-analyzer-agent",
          confidence: result.confidence,
        });
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push(`Task analysis failed: ${error}`);
      await progress.emit("error", `Task analysis failed: ${error}`, {
        agentId: "task-analyzer-agent",
        error,
      });
      return undefined;
    }
  }

  /**
   * Run context extraction agent with error handling
   */
  private async runContextExtractionAgent(
    _context: ProcessingContext,
    progress: ProgressTracker,
    localBrain: LocalBrain,
    errors: string[],
  ): Promise<ContextExtractionResult | undefined> {
    try {
      const result = await this.contextExtractorAgent.extractContext(
        localBrain.title,
        localBrain.description,
        localBrain.contentSummary,
        undefined,
      );

      if (result?.success) {
        await progress.emit(
          "extracting-context",
          "Context extraction completed",
          {
            agentId: "context-extractor-agent",
            confidence: result.confidence,
            tagsCount: result.tags?.length || 0,
          },
        );
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push(`Context extraction failed: ${error}`);
      await progress.emit("error", `Context extraction failed: ${error}`, {
        agentId: "context-extractor-agent",
        error,
      });
      return undefined;
    }
  }

  /**
   * Run action extraction agent with error handling
   */
  private async runActionExtractionAgent(
    _context: ProcessingContext,
    progress: ProgressTracker,
    localBrain: LocalBrain,
    errors: string[],
  ): Promise<ActionExtractionResult | undefined> {
    try {
      const result = await this.actionExtractorAgent.extractActions(
        localBrain.title,
        localBrain.description,
        localBrain.contentSummary,
        localBrain.webContent,
      );

      if (result?.success) {
        await progress.emit(
          "extracting-actions",
          `Extracted ${result.totalActions || 0} actions${result.totalSolutions ? ` and ${result.totalSolutions} solution${result.totalSolutions > 1 ? "s" : ""}` : ""}`,
          {
            agentId: "action-extractor-agent",
            confidence: result.confidence,
            actionsCount: result.totalActions || 0,
            solutionsCount: result.totalSolutions || 0,
          },
        );
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push(`Action extraction failed: ${error}`);
      await progress.emit("error", `Action extraction failed: ${error}`, {
        agentId: "action-extractor-agent",
        error,
      });
      return undefined;
    }
  }

  /**
   * Phase 3: Execute actions using local brain and LLM
   */
  private async executeActions(
    _context: ProcessingContext,
    progress: ProgressTracker,
    localBrain: LocalBrain,
    actionExtraction: ActionExtractionResult | undefined,
    errors: string[],
  ): Promise<TaskAssistantResult | undefined> {
    if (
      !actionExtraction?.success ||
      !actionExtraction.actions ||
      actionExtraction.actions.length === 0
    ) {
      this.logger.log("Phase 3 skipped: No actions extracted to execute");
      return undefined;
    }

    await progress.emit(
      "executing-actions",
      `Executing ${actionExtraction.actions.length} extracted action(s) using local brain and LLM...`,
      {
        agentId: "task-assistant-agent",
        actionsCount: actionExtraction.actions.length,
      },
    );
    this.logger.log(
      `Phase 3: Executing ${actionExtraction.actions.length} actions using local brain and LLM`,
    );

    const taskAssistant = await this.taskAssistantAgent.processTask(
      localBrain.title,
      localBrain.description,
      localBrain.webContent,
      localBrain.contentSummary,
      actionExtraction.actions,
    );

    if (taskAssistant.success) {
      await progress.emit(
        "executing-actions",
        "Actions executed with LLM - results generated",
        {
          agentId: "task-assistant-agent",
          hasImplementation: !!taskAssistant.implementation,
          hasQualityCheck: !!taskAssistant.qualityCheck,
          stepsCount: taskAssistant.implementation?.steps?.length || 0,
        },
      );
      this.logger.log(
        "Phase 3 completed: Actions executed using local brain and LLM",
      );
    } else {
      errors.push(`Action execution failed: ${taskAssistant.error}`);
      await progress.emit(
        "error",
        `Action execution failed: ${taskAssistant.error}`,
        {
          agentId: "task-assistant-agent",
          error: taskAssistant.error,
        },
      );
      this.logger.warn(
        `Phase 3 failed: Action execution with LLM failed: ${taskAssistant.error}`,
      );
    }

    return taskAssistant;
  }

  /**
   * Build final processing result
   */
  private buildResult(
    context: ProcessingContext,
    url: string | undefined,
    webContent: WebContentResult | undefined,
    summarization: SummarizationResult | undefined,
    taskAnalysis: TaskAnalysisResult | undefined,
    contextExtraction: ContextExtractionResult | undefined,
    actionExtraction: ActionExtractionResult | undefined,
    taskAssistant: TaskAssistantResult | undefined,
    processingTimeMs: number,
    errors: string[],
    progressHistory: AgentProcessingProgress[],
    _agentSelection: AgentSelectionResult,
  ): AgentProcessingResult {
    return {
      taskId: context.taskId,
      originalText: context.originalText,
      url,
      webContent,
      summarization,
      taskAnalysis,
      contextExtraction,
      actionExtraction,
      taskAssistant,
      // markdownFormat is set later after hints are auto-applied
      markdownFormat: undefined,
      processingTimeMs,
      errors: errors.length > 0 ? errors : undefined,
      progress: progressHistory,
    };
  }

  /**
   * Finalize processing with logging and event publishing
   */
  private async finalizeProcessing(
    context: ProcessingContext,
    progress: ProgressTracker,
    result: AgentProcessingResult,
    processingTimeMs: number,
    errors: string[],
  ): Promise<void> {
    const successfulAgents = Object.values({
      webContent: result.webContent,
      summarization: result.summarization,
      taskAnalysis: result.taskAnalysis,
      contextExtraction: result.contextExtraction,
      actionExtraction: result.actionExtraction,
      taskAssistant: result.taskAssistant,
    }).filter(
      (v) => v && typeof v === "object" && "success" in v && v.success,
    ).length;

    progress.setProgress(100);
    await progress.emit("completed", "Agent processing completed", {
      processingTimeMs,
      errorsCount: errors.length,
      successfulAgents,
    });

    this.logger.log(
      `Task ${context.taskId} processed in ${processingTimeMs}ms ` +
        `(${errors.length} errors, ${successfulAgents} successful agents)`,
    );

    // Publish completion event
    try {
      await this.eventBus.publish(
        new AgentCompletedEvent(
          context.taskIdVO,
          context.boardIdVO,
          processingTimeMs,
          successfulAgents,
          errors.length > 0 ? errors : undefined,
        ),
      );
    } catch (error) {
      this.logger.warn("Failed to publish completion event", error);
    }
  }

  /**
   * Log agent selection for debugging
   */
  private logAgentSelection(agentSelection: AgentSelectionResult): void {
    this.logger.log(
      `Agent selection: WebContent=${agentSelection.shouldUseWebContent}, ` +
        `Summarization=${agentSelection.shouldUseSummarization}, ` +
        `TaskAnalysis=${agentSelection.shouldUseTaskAnalysis}, ` +
        `ContextExtraction=${agentSelection.shouldUseContextExtraction}, ` +
        `ActionExtraction=${agentSelection.shouldUseActionExtraction} ` +
        `(reasoning: ${agentSelection.reasoning})`,
    );
  }
}
