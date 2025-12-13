import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseAndValidateJson } from '@personal-kanban/shared';
import { actionExtractionResponseSchema } from '../../shared/schemas/agent-schemas';
import { validateDescription, validateTitle } from '../../shared/utils/input-validator.util';
import { BaseAgent } from './base-agent';
import { filterTrivialActions } from './utils/action-filter.util';

export interface ActionItem {
    description: string;
    priority?: 'low' | 'medium' | 'high';
    estimatedDuration?: string;
}

export interface ActionExtractionResult {
    agentId: string;
    success: boolean;
    confidence?: number;
    error?: string;
    metadata?: Record<string, unknown>;
    actions?: ActionItem[];
    totalActions?: number;
}

/**
 * Action Extractor Agent
 * Extracts actionable items from content summaries
 * Helps break down complex tasks into smaller actions
 * Works only on provided content - no invention
 */
@Injectable()
export class ActionExtractorAgent extends BaseAgent {
    readonly agentId = 'action-extractor-agent';

    constructor(config: ConfigService) {
        super(config, ActionExtractorAgent.name);
    }

    /**
     * Extract actionable items from content
     */
    async extractActions(
        title: string,
        description?: string,
        contentSummary?: string,
    ): Promise<ActionExtractionResult> {
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

        if (!contentSummary && !description) {
            // If no substantial content, try to extract from title alone
            return {
                agentId: this.agentId,
                success: true,
                confidence: 0.3,
                actions: [
                    {
                        description: title,
                        priority: 'medium',
                    },
                ],
                totalActions: 1,
                metadata: {
                    extractedFrom: 'title-only',
                },
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

            const prompt = this.buildExtractionPrompt(title, description, contentSummary);

            this.logOperation('Extracting actions', {
                title: title.substring(0, 50),
                hasDescription: !!description,
                hasContentSummary: !!contentSummary,
            });

            const response = await this.callLlm(
                () =>
                    this.ollama.generate({
                        model: this.model,
                        prompt,
                        stream: false,
                        format: 'json',
                        options: {
                            temperature: 0.5,
                        },
                    }),
                'action extraction',
            );

            const extractionText = response.response || '';

            // Parse and validate JSON (LLM response doesn't include agentId/success)
            const parseResult = parseAndValidateJson(
                extractionText,
                actionExtractionResponseSchema,
                {
                    warn: (msg, ...args) => this.logger.warn(msg, ...args),
                },
                'action extraction',
            );

            if (parseResult.success) {
                const extraction = parseResult.data;
                const rawActions = extraction.actions || [];

                // Filter out trivial actions
                const filteredActions = filterTrivialActions(rawActions);
                const filteredCount = rawActions.length - filteredActions.length;

                if (filteredCount > 0) {
                    this.logger.debug(
                        `Filtered out ${filteredCount} trivial action(s) from ${rawActions.length} total`,
                    );
                }

                const totalActions = filteredActions.length;

                this.logOperation('Actions extracted', {
                    totalActions,
                    actionsCount: filteredActions.length,
                    filteredCount,
                });

                return {
                    agentId: this.agentId,
                    success: true,
                    confidence: filteredActions.length > 0 ? 0.8 : 0.5,
                    actions: filteredActions.length > 0 ? filteredActions : undefined,
                    totalActions,
                    metadata: {
                        model: this.model,
                        filteredCount,
                        originalCount: rawActions.length,
                    },
                };
            }

            const errorMessage =
                'error' in parseResult
                    ? parseResult.error
                    : 'Failed to parse action extraction result';
            this.logError('Failed to parse action extraction result', new Error(errorMessage));
            return {
                agentId: this.agentId,
                success: false,
                confidence: 0,
                error: errorMessage,
            };
        } catch (error) {
            this.logError('Error extracting actions', error, { title: title.substring(0, 50) });
            return {
                agentId: this.agentId,
                success: false,
                confidence: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Build the action extraction prompt
     */
    private buildExtractionPrompt(
        title: string,
        description?: string,
        contentSummary?: string,
    ): string {
        let content = title;
        if (description) {
            content += `\n\n${description}`;
        }
        if (contentSummary) {
            content += `\n\n[Content Summary]\n${contentSummary}`;
        }

        return `You are a sophisticated task support agent. Your role is to help humans complete tasks by breaking them down into meaningful, substantive actions. You act as a knowledgeable supporter, not a trivial assistant.

Extract actionable items from the following task to help the human perform the task step-by-step. Break down the task into specific, concrete actions that provide real value. Return a JSON object:

{
  "actions": [
    {
      "description": "specific action item",
      "priority": "low" | "medium" | "high",
      "estimatedDuration": "30 minutes" | "1 hour" | etc.
    }
  ],
  "totalActions": number
}

Task:
${content}

CRITICAL RULES - You are a sophisticated supporter:
- Your goal is to break down the task into meaningful, substantive steps that guide the human to complete the task successfully
- Extract 1-10 specific, actionable items that directly help complete the task
- Each action should be concrete, completable, and provide real value - something meaningful the human needs to do
- DO NOT include trivial actions such as:
  * "Open browser" or "Navigate to URL" (these are obvious and don't help)
  * "Read the content" or "View the page" (too generic)
  * "Click on link" or "Visit website" (trivial navigation steps)
  * Any action that is just about accessing or viewing content without doing something with it
- Focus on actions that involve: analysis, decision-making, creation, implementation, configuration, problem-solving, or other substantive work
- Assign priority based on importance and logical order
- Estimate duration for each action if possible to help with planning
- If the task is simple, return 1-2 meaningful actions
- If complex, break it down into 3-10 substantive steps that form a clear path to completion
- Only extract actions from the provided content - do not invent actions
- Process all content (including summaries) with the goal of creating a clear, sophisticated action plan
- Think like a knowledgeable colleague who understands the task deeply, not a basic assistant

Examples of GOOD actions:
- "Analyze the requirements and identify key constraints"
- "Design the database schema based on the specifications"
- "Implement authentication middleware using OAuth2"
- "Write unit tests for the payment processing module"
- "Review the API documentation and identify integration points"

Examples of BAD actions (trivial - DO NOT include):
- "Open the browser"
- "Navigate to the website"
- "Read the documentation"
- "Click on the link"
- "Visit the URL"

Return only valid JSON, no markdown formatting.`;
    }
}
