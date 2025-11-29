import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { BaseAgent } from './base-agent';
import { parseAndValidateJson } from '../../shared/utils';
import { summarizationResultSchema } from '../../shared/schemas/agent-schemas';
import { validateContentSize, INPUT_LIMITS } from '../../shared/utils/input-validator.util';

export interface SummarizationResult {
  agentId: string;
  success: boolean;
  confidence?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  originalLength: number;
  summary: string;
  keyPoints?: string[];
  wordCount?: number;
}

/**
 * Content Summarizer Agent
 * Summarizes downloaded web content to make it easier to work with tasks
 * Only works on actual downloaded content - no invention
 */
@Injectable()
export class ContentSummarizerAgent extends BaseAgent {
  readonly agentId = 'content-summarizer-agent';

  constructor(config: ConfigService) {
    super(config, ContentSummarizerAgent.name);
  }

  /**
   * Summarize content using LLM
   * Works only on provided content - does not invent anything
   */
  async summarize(content: string, maxLength: number = 500): Promise<SummarizationResult> {
    if (!content || content.trim().length === 0) {
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: 'No content to summarize',
        originalLength: 0,
        summary: '',
      };
    }

    // Validate content size
    const validation = validateContentSize(content);
    if (!validation.valid) {
      this.logError('Content validation failed', new Error(validation.error || 'Invalid content'));
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: validation.error || 'Content validation failed',
        originalLength: content.length,
        summary: '',
      };
    }

    try {
      await this.ensureModel();

      const originalLength = content.length;

      // Truncate content if too long using base class method
      const contentToSummarize = this.validateAndTruncateContent(
        content,
        INPUT_LIMITS.CONTENT_MAX_LENGTH,
      );

      const prompt = this.buildSummarizationPrompt(contentToSummarize, maxLength);

      this.logOperation('Summarizing content', {
        originalLength,
        targetWords: maxLength,
        truncated: content.length !== contentToSummarize.length,
      });

      const response = await this.callLlm(
        () =>
          this.ollama.generate({
            model: this.model,
            prompt,
            stream: false,
            format: 'json',
            options: {
              temperature: 0.3, // Lower temperature for factual summarization
            },
          }),
        'content summarization',
      );

      const summaryText = response.response || '';

      // Parse and validate JSON
      const summarySchema = summarizationResultSchema.keys({
        originalLength: Joi.number().integer().min(0).required(),
        summary: Joi.string().required(),
        keyPoints: Joi.array().items(Joi.string().max(200)).max(10).optional(),
        wordCount: Joi.number().integer().min(0).optional(),
      });

      const parseResult = parseAndValidateJson(
        summaryText,
        summarySchema,
        this.logger,
        'content summarization',
      );

      if (parseResult.success) {
        const parsed = parseResult.data;
        const wordCount = parsed.wordCount || parsed.summary.split(/\s+/).length;

        this.logOperation('Content summarized', {
          wordCount,
          keyPointsCount: parsed.keyPoints?.length || 0,
          compressionRatio: originalLength > 0 ? parsed.summary.length / originalLength : 0,
        });

        return {
          agentId: this.agentId,
          success: true,
          confidence: parsed.summary.length > 0 ? 0.85 : 0.5,
          originalLength,
          summary: parsed.summary,
          keyPoints: parsed.keyPoints && parsed.keyPoints.length > 0 ? parsed.keyPoints : undefined,
          wordCount,
          metadata: {
            compressionRatio: originalLength > 0 ? parsed.summary.length / originalLength : 0,
            model: this.model,
          },
        };
      } else {
        // Fallback: use the raw response as summary
        this.logger.warn('JSON validation failed, using raw response as summary', {
          error: parseResult.error,
        });
        const fallbackSummary = summaryText.trim();
        return {
          agentId: this.agentId,
          success: true,
          confidence: 0.6,
          originalLength,
          summary: fallbackSummary,
          wordCount: fallbackSummary.split(/\s+/).length,
          metadata: {
            model: this.model,
            fallback: true,
            validationError: parseResult.error,
          },
        };
      }
    } catch (error) {
      this.logError('Error summarizing content', error, { contentLength: content.length });
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalLength: content.length,
        summary: '',
      };
    }
  }

  /**
   * Build the summarization prompt
   */
  private buildSummarizationPrompt(content: string, maxLength: number): string {
    return `You are a content summarizer. Summarize the following web content into a concise summary that will help someone understand and work with the task.

Rules:
- Only use information from the provided content - do not invent or add information
- Create a summary of approximately ${maxLength} words
- Extract 3-5 key points if the content is substantial
- Focus on actionable information and important facts
- Preserve important details like dates, names, numbers, and specific requirements

Return a JSON object with this structure:
{
  "summary": "concise summary text here",
  "keyPoints": ["point 1", "point 2", "point 3"]
}

Content to summarize:
${content}

Return only valid JSON, no markdown formatting.`;
  }
}

