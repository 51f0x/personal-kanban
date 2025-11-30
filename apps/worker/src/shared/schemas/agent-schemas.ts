import * as Joi from 'joi';

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
    .valid('EMAIL', 'MEETING', 'PHONE', 'READ', 'WATCH', 'DESK', 'OTHER')
    .allow(null)
    .optional(),
  waitingFor: Joi.string().allow(null).optional(),
  dueAt: Joi.string().isoDate().allow(null).optional(),
  needsBreakdown: Joi.boolean().optional(),
  suggestedTags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').allow(null).optional(),
  estimatedDuration: Joi.string().allow(null).optional(),
  confidence: Joi.number().min(0).max(1).optional(),
});

/**
 * Task analysis result schema (full agent result with agentId and success)
 */
export const taskAnalysisResultSchema = baseAgentResultSchema.keys({
  context: Joi.string()
    .valid('EMAIL', 'MEETING', 'PHONE', 'READ', 'WATCH', 'DESK', 'OTHER')
    .allow(null)
    .optional(),
  waitingFor: Joi.string().allow(null).optional(),
  dueAt: Joi.string().isoDate().allow(null).optional(),
  needsBreakdown: Joi.boolean().optional(),
  suggestedTags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').allow(null).optional(),
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
    .valid('EMAIL', 'MEETING', 'PHONE', 'READ', 'WATCH', 'DESK', 'OTHER')
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
    .valid('EMAIL', 'MEETING', 'PHONE', 'READ', 'WATCH', 'DESK', 'OTHER')
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
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  estimatedDuration: Joi.string().allow(null).optional(),
});

/**
 * Action extraction LLM response schema (what the LLM returns)
 * Does not include agentId and success - those are added by the agent
 */
export const actionExtractionResponseSchema = Joi.object({
  actions: Joi.array().items(actionItemSchema).max(50).optional(),
  totalActions: Joi.number().integer().min(0).optional(),
});

/**
 * Action extraction result schema (full agent result with agentId and success)
 */
export const actionExtractionResultSchema = baseAgentResultSchema.keys({
  actions: Joi.array().items(actionItemSchema).max(50).optional(),
  totalActions: Joi.number().integer().min(0).optional(),
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
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
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

