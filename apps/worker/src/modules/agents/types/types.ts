import type { TaskContext } from "@prisma/client";

/**
 * Base interface for all agent results
 */
export interface AgentResult {
  agentId: string;
  success: boolean;
  confidence?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Web content download result
 */
export interface WebContentResult extends AgentResult {
  url: string;
  title?: string;
  content?: string;
  textContent?: string;
  htmlContent?: string;
  contentType?: string;
  downloadedAt?: string;
}

/**
 * Content summarization result
 */
export interface SummarizationResult extends AgentResult {
  originalLength: number;
  summary: string;
  keyPoints?: string[];
  wordCount?: number;
}

/**
 * Task analysis result (enhanced)
 */
export interface TaskAnalysisResult extends AgentResult {
  context?: TaskContext;
  waitingFor?: string;
  dueAt?: string;
  needsBreakdown?: boolean;
  suggestedTags?: string[];
  priority?: "low" | "medium" | "high";
  estimatedDuration?: string;
  suggestedTitle?: string;
  suggestedDescription?: string;
}

/**
 * Context extraction result
 */
export interface ContextExtractionResult extends AgentResult {
  context?: TaskContext;
  tags?: string[];
  projectHints?: string[];
  estimatedDuration?: string;
}

/**
 * Solution proposal (simplified version for action extractor)
 */
export interface SolutionProposal {
  title: string;
  description: string;
  approach: string;
  steps: string[];
  pros?: string[];
  cons?: string[];
  estimatedEffort?: string;
  confidence?: number;
}

/**
 * Action extraction result
 * Now includes solution proposals based on context
 */
export interface ActionExtractionResult extends AgentResult {
  actions?: Array<{
    description: string;
    priority?: "low" | "medium" | "high";
    estimatedDuration?: string;
  }>;
  totalActions?: number;
  solutions?: SolutionProposal[];
  totalSolutions?: number;
}

/**
 * Markdown format result
 */
export interface MarkdownFormatResult extends AgentResult {
  formattedDescription: string;
  originalLength: number;
  formattedLength: number;
}

/**
 * @deprecated TODO: DELETE ASAP - Only used by TaskHelpAgent which is being deleted.
 * Task help result
 */
export interface TaskHelpResult extends AgentResult {
  helpText?: string;
  keySteps?: string[];
  prerequisites?: string[];
  resources?: string[];
}

/**
 * @deprecated TODO: DELETE ASAP - Only used by SolutionProposerAgent which is being deleted.
 * Solution proposal result
 */
export interface SolutionProposalResult extends AgentResult {
  solutions?: Array<{
    title: string;
    description: string;
    approach: string;
    steps: string[];
    pros?: string[];
    cons?: string[];
    estimatedEffort?: string;
    confidence?: number;
  }>;
  totalSolutions?: number;
}

/**
 * Task assistant result
 * Implements complete workflow: Clarification -> Structure -> Implementation -> QA
 */
export interface TaskAssistantResult extends AgentResult {
  clarificationQuestions?: string[];
  needsClarification?: boolean;
  structure?: {
    goal: string;
    requirements: string[];
    constraints: string[];
    desiredResult: string;
    format?: string;
    style?: string;
    assumptions?: string[];
  };
  implementation?: {
    result: string;
    steps: string[];
    deliverables: string[];
  };
  qualityCheck?: {
    completeness: number;
    clarity: number;
    practicality: number;
    optimizations: string[];
    finalResult: string;
  };
}

/**
 * Agent processing progress stage
 */
export type AgentProcessingStage =
  | "initializing"
  | "detecting-url"
  | "downloading-content"
  | "extracting-text"
  | "summarizing-content"
  | "building-context"
  | "analyzing-task"
  | "extracting-context"
  | "extracting-actions"
  | "executing-actions"
  | "formatting-markdown"
  | "applying-results"
  | "completed"
  | "error";

/**
 * Agent processing progress update
 */
export interface AgentProcessingProgress {
  taskId: string;
  stage: AgentProcessingStage;
  progress: number; // 0-100
  message: string;
  details?: {
    url?: string;
    contentLength?: number;
    summaryLength?: number;
    agentId?: string;
    error?: string;
    [key: string]: unknown;
  };
  timestamp: string;
}

/**
 * Callback function for processing progress updates
 */
export type AgentProgressCallback = (
  progress: AgentProcessingProgress,
) => void | Promise<void>;

/**
 * Complete agent processing result
 * Contains results from agents that prepare work tasks for human execution
 */
export interface AgentProcessingResult {
  taskId: string;
  originalText: string;
  url?: string;
  webContent?: WebContentResult;
  summarization?: SummarizationResult;
  taskAnalysis?: TaskAnalysisResult;
  contextExtraction?: ContextExtractionResult;
  actionExtraction?: ActionExtractionResult;
  taskAssistant?: TaskAssistantResult;
  markdownFormat?: MarkdownFormatResult;
  processingTimeMs?: number;
  errors?: string[];
  progress?: AgentProcessingProgress[]; // Full progress history
}
