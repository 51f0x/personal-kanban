/**
 * Assistant processing types for API module
 * These mirror the types from the worker assistant module
 */

export type AssistantProcessingStage =
  | "analysis"
  | "local-brain-prep"
  | "task-breakdown"
  | "research-planning"
  | "web-research"
  | "prioritization"
  | "decision-support"
  | "final-assembly"
  | "completed"
  | "error";

export interface AssistantProcessingProgress {
  requestId: string;
  stage: AssistantProcessingStage;
  progress: number; // 0-100
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Assistant request input (to Redis queue)
 */
export interface AssistantRequest {
  requestId: string;
  task: string; // Main task/objective description
  context?: {
    role?: string;
    audience?: string;
    scope?: string;
    deadline?: string;
    resources?: string[];
    tools?: string[];
  };
  constraints?: {
    timeBudget?: string;
    qualityLevel?: string;
    mustHaves?: string[];
  };
  deliverables?: Array<{
    name: string;
    format?: string;
    description?: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Assistant response output (from Redis queue)
 */
export interface AssistantResponse {
  requestId: string;
  success: boolean;
  result?: {
    objective: string;
    successCriteria?: string[];
    todoList?: Array<{
      id: string;
      title: string;
      description?: string;
      dependencies?: string[];
      priority?: "must" | "should" | "could";
      estimatedTime?: string;
    }>;
    priorities?: {
      must?: string[];
      should?: string[];
      could?: string[];
    };
    schedule?: {
      today?: string[];
      thisWeek?: string[];
      recommendations?: string[];
    };
    researchSummary?: {
      keyFindings: string[];
      sources: Array<{
        url: string;
        title?: string;
        keyTakeaways?: string[];
      }>;
    };
    risks?: Array<{
      risk: string;
      mitigation?: string;
      probability?: "low" | "medium" | "high";
    }>;
    nextActions?: Array<{
      taskId: string;
      description: string;
      estimatedTime?: string;
    }>;
  };
  error?: string;
  processingTimeMs: number;
  errors?: string[];
  progress?: AssistantProcessingProgress[];
}

