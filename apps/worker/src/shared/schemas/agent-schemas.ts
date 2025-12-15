import * as Joi from "joi";

/**
 * Base agent result schema
 */
const baseAgentResultSchema = Joi.object({
  agentId: Joi.string().required(),
  success: Joi.boolean().required(),
  confidence: Joi.number().min(0).max(1).optional(),
  error: Joi.string().optional(),
  metadata: Joi.object().unknown(true).optional(),
});

/**
 * Task analysis LLM response schema (what the LLM returns)
 * Does not include agentId and success - those are added by the agent
 */
export const taskAnalysisResponseSchema = Joi.object({
  suggestedTitle: Joi.string().max(500).optional(),
  suggestedDescription: Joi.string().max(10000).allow(null).optional(),
  context: Joi.string()
    .valid("EMAIL", "MEETING", "PHONE", "READ", "WATCH", "DESK", "OTHER")
    .allow(null)
    .optional(),
  waitingFor: Joi.string().allow(null).optional(),
  dueAt: Joi.string().isoDate().allow(null).optional(),
  needsBreakdown: Joi.boolean().optional(),
  suggestedTags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  priority: Joi.string().valid("low", "medium", "high").allow(null).optional(),
  estimatedDuration: Joi.string().allow(null).optional(),
  confidence: Joi.number().min(0).max(1).optional(),
});

/**
 * Task analysis result schema (full agent result with agentId and success)
 */
export const taskAnalysisResultSchema = baseAgentResultSchema.keys({
  context: Joi.string()
    .valid("EMAIL", "MEETING", "PHONE", "READ", "WATCH", "DESK", "OTHER")
    .allow(null)
    .optional(),
  waitingFor: Joi.string().allow(null).optional(),
  dueAt: Joi.string().isoDate().allow(null).optional(),
  needsBreakdown: Joi.boolean().optional(),
  suggestedTags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  priority: Joi.string().valid("low", "medium", "high").allow(null).optional(),
  estimatedDuration: Joi.string().allow(null).optional(),
  suggestedTitle: Joi.string().max(500).optional(),
  suggestedDescription: Joi.string().max(10000).optional(),
});

/**
 * Context extraction LLM response schema (what the LLM returns)
 * Does not include agentId and success - those are added by the agent
 */
export const contextExtractionResponseSchema = Joi.object({
  context: Joi.string()
    .valid("EMAIL", "MEETING", "PHONE", "READ", "WATCH", "DESK", "OTHER")
    .allow(null)
    .optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  projectHints: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  estimatedDuration: Joi.string().allow(null).optional(),
  confidence: Joi.number().min(0).max(1).optional(),
});

/**
 * Context extraction result schema (full agent result with agentId and success)
 */
export const contextExtractionResultSchema = baseAgentResultSchema.keys({
  context: Joi.string()
    .valid("EMAIL", "MEETING", "PHONE", "READ", "WATCH", "DESK", "OTHER")
    .allow(null)
    .optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  projectHints: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  estimatedDuration: Joi.string().allow(null).optional(),
});

/**
 * Action item schema
 */
const actionItemSchema = Joi.object({
  description: Joi.string().required().max(500),
  priority: Joi.string().valid("low", "medium", "high").optional(),
  estimatedDuration: Joi.string().allow(null).optional(),
});

/**
 * Solution proposal item schema (simplified for action extractor)
 */
const solutionProposalItemSimpleSchema = Joi.object({
  title: Joi.string().required().max(200),
  description: Joi.string().required().max(1000),
  approach: Joi.string().required().max(2000),
  steps: Joi.array().items(Joi.string().max(500)).min(1).max(20).required(),
  pros: Joi.array().items(Joi.string().max(300)).max(10).optional(),
  cons: Joi.array().items(Joi.string().max(300)).max(10).optional(),
  estimatedEffort: Joi.string().max(100).optional(),
  confidence: Joi.number().min(0).max(1).optional(),
});

/**
 * Action extraction LLM response schema (what the LLM returns)
 * Does not include agentId and success - those are added by the agent
 * Now includes solutions based on context
 */
export const actionExtractionResponseSchema = Joi.object({
  actions: Joi.array().items(actionItemSchema).max(50).optional(),
  totalActions: Joi.number().integer().min(0).optional(),
  solutions: Joi.array()
    .items(solutionProposalItemSimpleSchema)
    .max(10)
    .optional(),
  totalSolutions: Joi.number().integer().min(0).optional(),
});

/**
 * Action extraction result schema (full agent result with agentId and success)
 * Now includes solutions based on context
 */
export const actionExtractionResultSchema = baseAgentResultSchema.keys({
  actions: Joi.array().items(actionItemSchema).max(50).optional(),
  totalActions: Joi.number().integer().min(0).optional(),
  solutions: Joi.array()
    .items(solutionProposalItemSimpleSchema)
    .max(10)
    .optional(),
  totalSolutions: Joi.number().integer().min(0).optional(),
});

/**
 * Summarization LLM response schema (what the LLM returns)
 * Does not include agentId and success - those are added by the agent
 */
export const summarizationResponseSchema = Joi.object({
  summary: Joi.string().required(),
  keyPoints: Joi.array().items(Joi.string().max(200)).max(10).optional(),
});

/**
 * Summarization result schema (full agent result with agentId and success)
 */
export const summarizationResultSchema = baseAgentResultSchema.keys({
  originalLength: Joi.number().integer().min(0).required(),
  summary: Joi.string().required(),
  keyPoints: Joi.array().items(Joi.string().max(200)).max(10).optional(),
  wordCount: Joi.number().integer().min(0).optional(),
});

/**
 * Web content result schema
 */
export const webContentResultSchema = baseAgentResultSchema.keys({
  url: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required(),
  title: Joi.string().max(500).optional(),
  content: Joi.string().optional(),
  textContent: Joi.string().optional(),
  htmlContent: Joi.string().optional(),
  contentType: Joi.string().optional(),
  downloadedAt: Joi.string().isoDate().optional(),
});

/**
 * Agent selection result schema
 */
export const agentSelectionResultSchema = Joi.object({
  shouldUseWebContent: Joi.boolean().required(),
  shouldUseSummarization: Joi.boolean().required(),
  shouldUseTaskAnalysis: Joi.boolean().required(),
  shouldUseContextExtraction: Joi.boolean().required(),
  shouldUseActionExtraction: Joi.boolean().required(),
  reasoning: Joi.string().required().max(500),
  confidence: Joi.number().min(0).max(1).required(),
});

/**
 * Solution proposal item schema
 */
const solutionProposalItemSchema = Joi.object({
  title: Joi.string().required().max(200),
  description: Joi.string().required().max(1000),
  approach: Joi.string().required().max(2000),
  steps: Joi.array().items(Joi.string().max(500)).min(1).max(20).required(),
  pros: Joi.array().items(Joi.string().max(300)).max(10).optional(),
  cons: Joi.array().items(Joi.string().max(300)).max(10).optional(),
  estimatedEffort: Joi.string().max(100).optional(),
  confidence: Joi.number().min(0).max(1).optional(),
});

/**
 * @deprecated TODO: DELETE ASAP - Only used by SolutionProposerAgent which is being deleted.
 * Solution proposal LLM response schema (what the LLM returns)
 * Does not include agentId and success - those are added by the agent
 */
export const solutionProposalResponseSchema = Joi.object({
  solutions: Joi.array()
    .items(solutionProposalItemSchema)
    .min(1)
    .max(10)
    .required(),
  totalSolutions: Joi.number().integer().min(1).max(10).optional(),
  confidence: Joi.number().min(0).max(1).optional(),
});

/**
 * @deprecated TODO: DELETE ASAP - Never used, only SolutionProposerAgent would use it (which is being deleted).
 * Solution proposal result schema (full agent result with agentId and success)
 */
export const solutionProposalResultSchema = baseAgentResultSchema.keys({
  solutions: Joi.array()
    .items(solutionProposalItemSchema)
    .min(1)
    .max(10)
    .optional(),
  totalSolutions: Joi.number().integer().min(0).optional(),
});

/**
 * @deprecated TODO: DELETE ASAP - Only used by TaskHelpAgent which is being deleted.
 * Task help LLM response schema (what the LLM returns)
 * Does not include agentId and success - those are added by the agent
 */
export const taskHelpResponseSchema = Joi.object({
  helpText: Joi.string().required(),
  keySteps: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  prerequisites: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  resources: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  confidence: Joi.number().min(0).max(1).required(),
});

/**
 * @deprecated TODO: DELETE ASAP - Never used, only TaskHelpAgent would use it (which is being deleted).
 * Task help result schema (full agent result with agentId and success)
 */
export const taskHelpResultSchema = baseAgentResultSchema.keys({
  helpText: Joi.string().optional(),
  keySteps: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  prerequisites: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  resources: Joi.array().items(Joi.string().max(500)).max(20).optional(),
});

/**
 * Task assistant LLM response schema (what the LLM returns)
 * Does not include agentId and success - those are added by the agent
 */
export const taskAssistantResponseSchema = Joi.object({
  clarification: Joi.object({
    needsClarification: Joi.boolean().required(),
    // Questions are optional when needsClarification is false
    // The prompt guides the LLM to provide questions when needsClarification is true
    questions: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  }).required(),
  structure: Joi.object({
    goal: Joi.string().required().max(1000),
    requirements: Joi.array().items(Joi.string().max(500)).max(50).optional(),
    constraints: Joi.array().items(Joi.string().max(500)).max(50).optional(),
    desiredResult: Joi.string().required().max(2000),
    format: Joi.string().max(100).allow(null).optional(),
    style: Joi.string().max(200).allow(null).optional(),
    assumptions: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  }).required(),
  implementation: Joi.object({
    result: Joi.string().required(),
    steps: Joi.array().items(Joi.string().max(500)).max(50).optional(),
    deliverables: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  }).required(),
  qualityCheck: Joi.object({
    completeness: Joi.number().min(0).max(1).required(),
    clarity: Joi.number().min(0).max(1).required(),
    practicality: Joi.number().min(0).max(1).required(),
    optimizations: Joi.array().items(Joi.string().max(500)).max(20).optional(),
    finalResult: Joi.string().required(),
  }).required(),
  confidence: Joi.number().min(0).max(1).required(),
});

/**
 * Task assistant result schema (full agent result with agentId and success)
 */
export const taskAssistantResultSchema = baseAgentResultSchema.keys({
  clarificationQuestions: Joi.array()
    .items(Joi.string().max(500))
    .max(20)
    .optional(),
  needsClarification: Joi.boolean().optional(),
  structure: Joi.object({
    goal: Joi.string().max(1000).optional(),
    requirements: Joi.array().items(Joi.string().max(500)).max(50).optional(),
    constraints: Joi.array().items(Joi.string().max(500)).max(50).optional(),
    desiredResult: Joi.string().max(2000).optional(),
    format: Joi.string().max(100).allow(null).optional(),
    style: Joi.string().max(200).allow(null).optional(),
    assumptions: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  }).optional(),
  implementation: Joi.object({
    result: Joi.string().optional(),
    steps: Joi.array().items(Joi.string().max(500)).max(50).optional(),
    deliverables: Joi.array().items(Joi.string().max(500)).max(20).optional(),
  }).optional(),
  qualityCheck: Joi.object({
    completeness: Joi.number().min(0).max(1).optional(),
    clarity: Joi.number().min(0).max(1).optional(),
    practicality: Joi.number().min(0).max(1).optional(),
    optimizations: Joi.array().items(Joi.string().max(500)).max(20).optional(),
    finalResult: Joi.string().optional(),
  }).optional(),
});
