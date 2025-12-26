/**
 * Local Brain data structure - shared knowledge storage for orchestration
 */
export interface LocalBrain {
  objective: string;
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
  openQuestions?: Array<{
    question: string;
    neededInput?: string;
  }>;
  taskBacklog?: Array<{
    id: string;
    title: string;
    description?: string;
    type?: "preparation" | "research" | "implementation" | "followup";
    effort?: string;
    dependencies?: string[];
    status?: "pending" | "in_progress" | "completed" | "failed";
  }>;
  researchPlan?: {
    guidingQuestions?: string[];
    searchTerms?: string[];
    sourceTypes?: string[];
    qualityCriteria?: string[];
    stopCriteria?: string;
  };
  sources?: Array<{
    url: string;
    title?: string;
    date?: string;
    trustLevel?: number;
    keyTakeaways?: string[];
  }>;
  decisions?: Array<{
    question: string;
    options: string[];
    criteria?: string[];
    recommendation?: string;
    rationale?: string;
    timestamp?: string;
  }>;
  risks?: Array<{
    risk: string;
    mitigation?: string;
    probability?: "low" | "medium" | "high";
  }>;
  deliverables?: Array<{
    name: string;
    format?: string;
    description?: string;
  }>;
  history?: Array<{
    runId: string;
    agentId: string;
    output: unknown;
    timestamp: string;
  }>;
}

/**
 * Analyst Agent Result
 */
export interface AnalystResult {
  agentId: "analyst";
  success: boolean;
  confidence?: number;
  error?: string;
  objective?: string;
  constraints?: LocalBrain["constraints"];
  deliverables?: LocalBrain["deliverables"];
  openQuestions?: LocalBrain["openQuestions"];
  assumptions?: string[];
  risks?: LocalBrain["risks"];
  context?: LocalBrain["context"];
}

/**
 * Task Breakdown Agent Result
 */
export interface TaskBreakdownResult {
  agentId: "task-breakdown";
  success: boolean;
  confidence?: number;
  error?: string;
  tasks?: LocalBrain["taskBacklog"];
}

/**
 * Research Planner Agent Result
 */
export interface ResearchPlannerResult {
  agentId: "research-planner";
  success: boolean;
  confidence?: number;
  error?: string;
  researchPlan?: LocalBrain["researchPlan"];
}

/**
 * Web Researcher Agent Result
 */
export interface WebResearcherResult {
  agentId: "web-researcher";
  success: boolean;
  confidence?: number;
  error?: string;
  sources?: LocalBrain["sources"];
  topFindings?: string[];
  facts?: Array<{ fact: string; source?: string }>;
  controversies?: string[];
}

/**
 * Prioritizer & Scheduler Agent Result
 */
export interface PrioritizerSchedulerResult {
  agentId: "prioritizer-scheduler";
  success: boolean;
  confidence?: number;
  error?: string;
  prioritizedTasks?: Array<{
    taskId: string;
    priority: "must" | "should" | "could";
    order: number;
    estimatedTime?: string;
  }>;
  schedule?: {
    today?: string[];
    thisWeek?: string[];
    recommendations?: string[];
  };
  nextActions?: Array<{
    taskId: string;
    description: string;
    estimatedTime?: string;
  }>;
}

/**
 * Decision Support Agent Result
 */
export interface DecisionSupportResult {
  agentId: "decision-support";
  success: boolean;
  confidence?: number;
  error?: string;
  decision?: LocalBrain["decisions"][number];
}

/**
 * Final Assembler Result
 */
export interface FinalAssemblerResult {
  agentId: "final-assembler";
  success: boolean;
  confidence?: number;
  error?: string;
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
    schedule?: PrioritizerSchedulerResult["schedule"];
    researchSummary?: {
      keyFindings: string[];
      sources: LocalBrain["sources"];
    };
    risks?: LocalBrain["risks"];
    nextActions?: PrioritizerSchedulerResult["nextActions"];
  };
}

/**
 * Assistant processing progress
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
 * Complete assistant processing result
 */
export interface AssistantProcessingResult {
  requestId: string;
  localBrain: LocalBrain;
  analyst?: AnalystResult;
  taskBreakdown?: TaskBreakdownResult;
  researchPlanner?: ResearchPlannerResult;
  webResearcher?: WebResearcherResult;
  prioritizerScheduler?: PrioritizerSchedulerResult;
  decisionSupport?: DecisionSupportResult;
  finalAssembler?: FinalAssemblerResult;
  processingTimeMs: number;
  errors?: string[];
  progress?: AssistantProcessingProgress[];
}

/**
 * Assistant request input (from Redis queue)
 */
export interface AssistantRequest {
  requestId: string;
  task: string; // Main task/objective description
  projectId?: string; // Project ID - if provided, use the project's local brain
  context?: LocalBrain["context"];
  constraints?: LocalBrain["constraints"];
  deliverables?: LocalBrain["deliverables"];
  metadata?: Record<string, unknown>;
}

/**
 * Assistant response output (to Redis queue)
 */
export interface AssistantResponse {
  requestId: string;
  success: boolean;
  result?: FinalAssemblerResult["result"];
  error?: string;
  processingTimeMs: number;
  errors?: string[];
  progress?: AssistantProcessingProgress[];
}

