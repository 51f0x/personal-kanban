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
  context?: string;
  waitingFor?: string;
  dueAt?: string;
  needsBreakdown?: boolean;
  suggestedTags?: string[];
  priority?: 'low' | 'medium' | 'high';
  estimatedDuration?: string;
  suggestedTitle?: string;
  suggestedDescription?: string;
}

/**
 * Context extraction result
 */
export interface ContextExtractionResult extends AgentResult {
  context?: string;
  tags?: string[];
  projectHints?: string[];
  estimatedDuration?: string;
}

/**
 * Action extraction result
 */
export interface ActionExtractionResult extends AgentResult {
  actions?: Array<{
    description: string;
    priority?: 'low' | 'medium' | 'high';
    estimatedDuration?: string;
  }>;
  totalActions?: number;
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
 * Agent processing progress stage
 */
export type AgentProcessingStage =
  | 'initializing'
  | 'detecting-url'
  | 'downloading-content'
  | 'extracting-text'
  | 'summarizing-content'
  | 'analyzing-task'
  | 'extracting-context'
  | 'extracting-actions'
  | 'formatting-markdown'
  | 'applying-results'
  | 'completed'
  | 'error';

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
export type AgentProgressCallback = (progress: AgentProcessingProgress) => void | Promise<void>;

/**
 * Complete agent processing result
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
  markdownFormat?: MarkdownFormatResult;
  processingTimeMs?: number;
  errors?: string[];
  progress?: AgentProcessingProgress[]; // Full progress history
}

