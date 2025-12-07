import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent } from './base-agent';
import { parseAndValidateJson } from '@personal-kanban/shared';
import { agentSelectionResultSchema } from '../../shared/schemas/agent-schemas';
import { validateTitle, validateDescription } from '../../shared/utils/input-validator.util';

/**
 * Agent Selection Result
 */
export interface AgentSelectionResult {
    shouldUseWebContent: boolean;
    shouldUseSummarization: boolean;
    shouldUseTaskAnalysis: boolean;
    shouldUseContextExtraction: boolean;
    shouldUseActionExtraction: boolean;
    reasoning: string;
    confidence: number;
}

/**
 * Agent Selector
 * Uses AI to determine which agents are most relevant for processing a task
 */
@Injectable()
export class AgentSelectorAgent extends BaseAgent {
    readonly agentId = 'agent-selector-agent';

    constructor(config: ConfigService) {
        super(config, AgentSelectorAgent.name);
    }

    /**
     * Analyze task content and determine which agents should be used
     */
    async selectAgents(
        title: string,
        description?: string,
        hasUrl?: boolean,
        urlContentLength?: number,
    ): Promise<AgentSelectionResult> {
        // Validate inputs
        const titleValidation = validateTitle(title);
        if (!titleValidation.valid) {
            this.logError(
                'Title validation failed',
                new Error(titleValidation.error || 'Invalid title'),
                {
                    title: title.substring(0, 50),
                },
            );
            return this.getDefaultSelection(title, description, hasUrl, urlContentLength);
        }

        if (description) {
            const descValidation = validateDescription(description);
            if (!descValidation.valid) {
                this.logError(
                    'Description validation failed',
                    new Error(descValidation.error || 'Invalid description'),
                );
                return this.getDefaultSelection(title, description, hasUrl, urlContentLength);
            }
        }

        try {
            await this.ensureModel();

            const prompt = this.buildSelectionPrompt(title, description, hasUrl, urlContentLength);

            this.logOperation('Selecting agents', { title: title.substring(0, 50), hasUrl });

            const response = await this.callLlm(
                () =>
                    this.ollama.generate({
                        model: this.model,
                        prompt,
                        stream: false,
                        format: 'json',
                        options: {
                            temperature: 0.3, // Lower temperature for more consistent decisions
                        },
                    }),
                'agent selection',
            );

            const selectionText = response.response || '';

            // Parse and validate JSON
            const parseResult = parseAndValidateJson(
                selectionText,
                agentSelectionResultSchema,
                {
                    warn: (msg, ...args) => this.logger.warn(msg, ...args),
                },
                'agent selection',
            );

            if (parseResult.success) {
                const result = parseResult.data;

                this.logOperation('Agent selection completed', {
                    webContent: result.shouldUseWebContent,
                    summarization: result.shouldUseSummarization,
                    taskAnalysis: result.shouldUseTaskAnalysis,
                    contextExtraction: result.shouldUseContextExtraction,
                    actionExtraction: result.shouldUseActionExtraction,
                    confidence: result.confidence,
                });

                return result;
            }

            const errorMessage = 'error' in parseResult ? parseResult.error : 'Unknown error';
            this.logger.warn('Failed to parse agent selection response, using defaults', {
                error: errorMessage,
            });
            return this.getDefaultSelection(title, description, hasUrl, urlContentLength);
        } catch (error) {
            this.logError('Error selecting agents', error, { title: title.substring(0, 50) });
            // Return sensible defaults on error
            return this.getDefaultSelection(title, description, hasUrl, urlContentLength);
        }
    }

    /**
     * Build the prompt for agent selection
     */
    private buildSelectionPrompt(
        title: string,
        description?: string,
        hasUrl?: boolean,
        urlContentLength?: number,
    ): string {
        let taskText = title;
        if (description) {
            taskText += `\n\n${description}`;
        }

        const urlInfo = hasUrl
            ? `\n\n[URL detected: ${urlContentLength ? `${urlContentLength} characters of content` : 'Content available'}]`
            : '\n\n[No URL detected]';

        return `Analyze the following task and determine which specialized agents would be most useful for processing it. Return a JSON object with the following structure:

{
  "shouldUseWebContent": boolean,
  "shouldUseSummarization": boolean,
  "shouldUseTaskAnalysis": boolean,
  "shouldUseContextExtraction": boolean,
  "shouldUseActionExtraction": boolean,
  "reasoning": string (brief explanation of selection),
  "confidence": number (0-1)
}

Available Agents:
1. **WebContent Agent**: Downloads and extracts content from URLs
   - Use if: URL is present AND content needs to be downloaded
   
2. **Summarization Agent**: Creates concise summaries of long content
   - Use if: URL content is long (>500 chars) OR task needs content condensed
   - Skip if: Content is already short or not needed

3. **Task Analysis Agent**: Analyzes task and suggests title, description, context, tags, priority
   - Use if: Task needs metadata extraction or improvement
   - Usually: Always useful

4. **Context Extractor Agent**: Extracts context, tags, and project hints
   - Use if: Task needs categorization, tagging, or project association
   - Usually: Useful for most tasks

5. **Action Extractor Agent**: Breaks down task into actionable checklist items
   - Use if: Task is complex and needs breakdown into steps
   - Skip if: Task is simple/single action OR already broken down

Task:
${taskText}${urlInfo}

Guidelines:
- Only select agents that would provide meaningful value for this specific task
- Skip agents that wouldn't add value (e.g., don't summarize if content is already brief)
- Always use TaskAnalysis for metadata extraction unless task is trivial
- Use ActionExtraction only if task can be meaningfully broken down into steps
- Set confidence based on how certain you are about the selection (0.7-0.95 range)

Return only valid JSON, no markdown formatting.`;
    }

    /**
     * Get default agent selection based on heuristics
     */
    private getDefaultSelection(
        title: string,
        description?: string,
        hasUrl?: boolean,
        urlContentLength?: number,
    ): AgentSelectionResult {
        const shouldExtractActions = this.shouldExtractActions(title, description);
        const needsSummarization = (hasUrl ?? false) && (urlContentLength || 0) > 500;

        return {
            shouldUseWebContent: hasUrl ?? false,
            shouldUseSummarization: needsSummarization,
            shouldUseTaskAnalysis: true, // Always analyze
            shouldUseContextExtraction: true, // Usually useful
            shouldUseActionExtraction: shouldExtractActions,
            reasoning: 'Default selection based on heuristics',
            confidence: 0.7,
        };
    }

    /**
     * Heuristic: Should we extract actions?
     */
    private shouldExtractActions(title: string, description?: string): boolean {
        const text = `${title} ${description || ''}`.toLowerCase();

        // Keywords that suggest the task needs breakdown
        const actionKeywords = [
            'complete',
            'implement',
            'build',
            'create',
            'develop',
            'write',
            'review',
            'analyze',
            'plan',
            'design',
            'setup',
            'configure',
            'organize',
            'prepare',
        ];

        // Check if task suggests multiple steps
        const hasMultipleSteps =
            text.includes(' and ') ||
            text.includes(' then ') ||
            text.includes(',') ||
            text.includes(';') ||
            (text.match(/\d+/g)?.length || 0) > 1;

        // Check for action keywords
        const hasActionKeywords = actionKeywords.some((keyword) => text.includes(keyword));

        // Check length/complexity
        const isComplex = title.length + (description?.length || 0) > 100;

        return (hasMultipleSteps || (hasActionKeywords && isComplex)) ?? false;
    }
}
