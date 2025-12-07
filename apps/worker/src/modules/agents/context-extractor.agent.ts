import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskContext } from '@prisma/client';
import { BaseAgent } from './base-agent';
import { parseAndValidateJson } from '@personal-kanban/shared';
import { contextExtractionResponseSchema } from '../../shared/schemas/agent-schemas';
import { validateTitle, validateDescription } from '../../shared/utils/input-validator.util';
import type { ActionItem } from './action-extractor.agent';

export interface ContextExtractionResult {
    agentId: string;
    success: boolean;
    confidence?: number;
    error?: string;
    metadata?: Record<string, unknown>;
    context?: TaskContext;
    tags?: string[];
    projectHints?: string[];
    estimatedDuration?: string;
}

/**
 * Context Extractor Agent
 * Specialized agent for extracting context, tags, and project hints from content
 * Works only on provided data
 */
@Injectable()
export class ContextExtractorAgent extends BaseAgent {
    readonly agentId = 'context-extractor-agent';

    constructor(config: ConfigService) {
        super(config, ContextExtractorAgent.name);
    }

    /**
     * Extract context, tags, and project hints from content
     * Uses suggested actions to guide extraction
     */
    async extractContext(
        title: string,
        description?: string,
        contentSummary?: string,
        suggestedActions?: ActionItem[],
    ): Promise<ContextExtractionResult> {
        // Validate inputs
        const titleValidation = validateTitle(title);
        if (!titleValidation.valid) {
            this.logError(
                'Title validation failed',
                new Error(titleValidation.error || 'Invalid title'),
            );
            return {
                agentId: this.agentId,
                success: false,
                confidence: 0,
                error: titleValidation.error || 'Invalid title',
            };
        }

        if (description) {
            const descValidation = validateDescription(description);
            if (!descValidation.valid) {
                this.logError(
                    'Description validation failed',
                    new Error(descValidation.error || 'Invalid description'),
                );
                return {
                    agentId: this.agentId,
                    success: false,
                    confidence: 0,
                    error: descValidation.error || 'Invalid description',
                };
            }
        }

        try {
            await this.ensureModel();

            const prompt = this.buildExtractionPrompt(
                title,
                description,
                contentSummary,
                suggestedActions,
            );

            this.logOperation('Extracting context', {
                title: title.substring(0, 50),
                hasDescription: !!description,
                hasContentSummary: !!contentSummary,
                hasActions: !!suggestedActions && suggestedActions.length > 0,
                actionsCount: suggestedActions?.length || 0,
            });

            const response = await this.callLlm(
                () =>
                    this.ollama.generate({
                        model: this.model,
                        prompt,
                        stream: false,
                        format: 'json',
                        options: {
                            temperature: 0.4, // Lower temperature for more consistent extraction
                        },
                    }),
                'context extraction',
            );

            const extractionText = response.response || '';

            // Parse and validate JSON (LLM response doesn't include agentId/success)
            const parseResult = parseAndValidateJson(
                extractionText,
                contextExtractionResponseSchema,
                {
                    warn: (msg, ...args) => this.logger.warn(msg, ...args),
                },
                'context extraction',
            );

            if (parseResult.success) {
                const extraction = parseResult.data;
                return {
                    agentId: this.agentId,
                    success: true,
                    confidence: extraction.confidence || 0.75,
                    ...extraction,
                    metadata: {
                        ...(extraction.metadata || {}),
                        model: this.model,
                        hasSuggestedActions: !!suggestedActions && suggestedActions.length > 0,
                        actionsCount: suggestedActions?.length || 0,
                    },
                };
            }

            const errorMessage =
                'error' in parseResult ? parseResult.error : 'Failed to parse extraction result';
            this.logError('Failed to parse extraction result', new Error(errorMessage));
            return {
                agentId: this.agentId,
                success: false,
                confidence: 0,
                error: errorMessage,
            };
        } catch (error) {
            this.logError('Error extracting context', error, { title: title.substring(0, 50) });
            return {
                agentId: this.agentId,
                success: false,
                confidence: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Build the context extraction prompt
     */
    private buildExtractionPrompt(
        title: string,
        description?: string,
        contentSummary?: string,
        suggestedActions?: ActionItem[],
    ): string {
        let content = title;
        if (description) {
            content += `\n\n${description}`;
        }
        if (contentSummary) {
            content += `\n\n[Content Summary]\n${contentSummary}`;
        }

        let actionsText = '';
        if (suggestedActions && suggestedActions.length > 0) {
            actionsText = `\n\n[Suggested Actions to Guide Extraction]\n`;
            actionsText += suggestedActions
                .map(
                    (action, idx) =>
                        `${idx + 1}. ${action.description}${action.priority ? ` (Priority: ${action.priority})` : ''}${action.estimatedDuration ? ` [Duration: ${action.estimatedDuration}]` : ''}`,
                )
                .join('\n');
            actionsText +=
                '\n\nUse these suggested actions to inform your context extraction. Consider what context, tags, and project hints would be most relevant given these actions.';
        }

        return `Extract context, tags, and project hints from the following task content to help the human perform the task more effectively. Return a JSON object:

{
  "context": "EMAIL" | "MEETING" | "PHONE" | "READ" | "WATCH" | "DESK" | "OTHER" | null,
  "tags": string[],
  "projectHints": string[],
  "estimatedDuration": string | null,
  "confidence": number (0-1)
}

Task Content:
${content}${actionsText}

Rules:
- Your goal is to extract metadata that helps the human understand and complete this task
- Set "context" based on where/when the task should be done to help the human know when to work on it
- Extract 3-7 relevant tags (be specific, use lowercase, hyphenate multi-word tags) that help categorize and organize the task
- Suggest 0-3 project hints (if the task seems part of a larger project) to help connect related work
- Estimate duration if possible (e.g., "30 minutes", "1 hour") to help with time planning
- Set confidence based on how clear the context indicators are
- Only use information from the provided content - do not invent
- Process all content (including summaries) with the goal of making the task easier to organize and complete
- If suggested actions are provided, use them to guide your extraction - consider what context, tags, and project hints align with these actions
- Extract tags that are relevant to the suggested actions when available

Return only valid JSON, no markdown formatting.`;
    }
}
