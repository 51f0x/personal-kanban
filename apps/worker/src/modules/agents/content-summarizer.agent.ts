import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseAndValidateJson } from '@personal-kanban/shared';
import { summarizationResponseSchema } from '../../shared/schemas/agent-schemas';
import { INPUT_LIMITS, validateContentSize } from '../../shared/utils/input-validator.util';
import { BaseAgent } from './base-agent';

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

    readonly maxLength = 500;
    readonly minLength = 100;

    readonly model = 'granite4:1b';

    constructor(config: ConfigService) {
        super(config, ContentSummarizerAgent.name);
    }

    /**
   * Summarize content using LLM
   /**
    * Works only on provided content - does not invent anything
    * Summarizes content in the context of the task to help the human perform it better
    */
    async summarize(
        content: string,
        maxLength = 1000,
        taskTitle?: string,
        taskDescription?: string,
    ): Promise<SummarizationResult> {
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
            this.logError(
                'Content validation failed',
                new Error(validation.error || 'Invalid content'),
            );
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

            const prompt = this.buildSummarizationPrompt(
                contentToSummarize,
                maxLength,
                taskTitle,
                taskDescription,
            );

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

            // Parse and validate JSON (LLM response doesn't include agentId/success/originalLength/wordCount)
            const parseResult = parseAndValidateJson(
                summaryText,
                summarizationResponseSchema,
                {
                    warn: (msg, ...args) => this.logger.warn(msg, ...args),
                },
                'content summarization',
            );

            if (parseResult.success) {
                const parsed = parseResult.data;
                const wordCount = parsed.wordCount || parsed.summary.split(/\s+/).length;

                this.logOperation('Content summarized', {
                    wordCount,
                    keyPointsCount: parsed.keyPoints?.length || 0,
                    compressionRatio:
                        originalLength > 0 ? parsed.summary.length / originalLength : 0,
                });

                return {
                    agentId: this.agentId,
                    success: true,
                    confidence: parsed.summary.length > 0 ? 0.85 : 0.5,
                    originalLength,
                    summary: parsed.summary,
                    keyPoints:
                        parsed.keyPoints && parsed.keyPoints.length > 0
                            ? parsed.keyPoints
                            : undefined,
                    wordCount,
                    metadata: {
                        compressionRatio:
                            originalLength > 0 ? parsed.summary.length / originalLength : 0,
                        model: this.model,
                    },
                };
            }
            // Fallback: use the raw response as summary
            const errorMessage =
                'error' in parseResult ? parseResult.error : 'Unknown validation error';
            this.logger.warn('JSON validation failed, using raw response as summary', {
                error: errorMessage,
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
                    validationError: errorMessage,
                },
            };
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
    private buildSummarizationPrompt(
        content: string,
        maxLength: number,
        taskTitle?: string,
        taskDescription?: string,
    ): string {
        let taskContext = '';
        if (taskTitle || taskDescription) {
            taskContext = '\n\nTask to perform:\n';
            if (taskTitle) {
                taskContext += `Title: ${taskTitle}\n`;
            }
            if (taskDescription) {
                taskContext += `Description: ${taskDescription}\n`;
            }
            taskContext +=
                '\nYour goal is to summarize the content below in a way that helps the human perform this specific task. Focus on information that is relevant to completing the task.';
        }

        return `You are a content summarizer. Summarize the following web content into a concise summary that will help someone understand and work with the task.${taskContext}

Rules:
- Only use information from the provided content - do not invent or add information
- Create a summary of approximately ${maxLength} words
- Extract the key points from the content if the content is substantial
- Focus on actionable information and important facts that are relevant to the task
- Preserve important details like dates, names, numbers, and specific requirements
- If a task is provided, prioritize information that directly helps complete that task
- Guide the reader toward what they need to know to perform the task effectively

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
