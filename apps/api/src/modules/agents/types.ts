/**
 * Agent processing types for API module
 * These mirror the types from the worker module
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
  | 'applying-results'
  | 'completed'
  | 'error';

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

