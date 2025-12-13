import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseAndValidateJson } from '@personal-kanban/shared';
import { solutionProposalResponseSchema } from '../../shared/schemas/agent-schemas';
import { validateDescription, validateTitle } from '../../shared/utils/input-validator.util';
import { ActionItem } from './action-extractor.agent';
import { BaseAgent } from './base-agent';
import { filterTrivialSolutionSteps } from './utils/action-filter.util';

export interface SolutionProposal {
    title: string;
    description: string;
    approach: string;
    steps: string[];
    pros?: string[];
    cons?: string[];
    estimatedEffort?: string;
    confidence?: number;
}

export interface SolutionProposalResult {
    agentId: string;
    success: boolean;
    confidence?: number;
    error?: string;
    metadata?: Record<string, unknown>;
    solutions?: SolutionProposal[];
    totalSolutions?: number;
}

/**
 * Solution Proposer Agent
 * Proposes concrete solutions for tasks using LLM
 * Analyzes the task, extracted actions, and available content to suggest multiple solution approaches
 * This is a creative agent that generates solution proposals to help the user complete the task
 */
@Injectable()
export class SolutionProposerAgent extends BaseAgent {
    readonly agentId = 'solution-proposer-agent';

    constructor(config: ConfigService) {
        super(config, SolutionProposerAgent.name);
    }

    /**
     * Propose solutions for a task
     * Uses task information, extracted actions, and content to generate solution proposals
     */
    async proposeSolutions(
        title: string,
        description?: string,
        contentSummary?: string,
        webContent?: string,
        extractedActions?: ActionItem[],
    ): Promise<SolutionProposalResult> {
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

            const prompt = this.buildProposalPrompt(
                title,
                description,
                contentSummary,
                webContent,
                extractedActions,
            );

            this.logOperation('Proposing solutions', {
                title: title.substring(0, 50),
                hasDescription: !!description,
                hasContentSummary: !!contentSummary,
                hasWebContent: !!webContent,
                hasActions: !!extractedActions && extractedActions.length > 0,
                actionsCount: extractedActions?.length || 0,
            });

            const response = await this.callLlm(
                () =>
                    this.ollama.generate({
                        model: this.model,
                        prompt,
                        stream: false,
                        format: 'json',
                        options: {
                            temperature: 0.7, // Higher temperature for creative solution generation
                        },
                    }),
                'solution proposal',
            );

            const proposalText = response.response || '';

            // Parse and validate JSON (LLM response doesn't include agentId/success)
            const parseResult = parseAndValidateJson(
                proposalText,
                solutionProposalResponseSchema,
                {
                    warn: (msg, ...args) => this.logger.warn(msg, ...args),
                },
                'solution proposal',
            );

            if (parseResult.success) {
                const proposal = parseResult.data;
                const rawSolutions = proposal.solutions || [];

                // Filter trivial steps from each solution
                const filteredSolutions = rawSolutions
                    .map((solution: SolutionProposal) => {
                        const originalSteps = solution.steps || [];
                        const filteredSteps = filterTrivialSolutionSteps(originalSteps);
                        const filteredCount = originalSteps.length - filteredSteps.length;

                        if (filteredCount > 0) {
                            this.logger.debug(
                                `Filtered out ${filteredCount} trivial step(s) from solution "${solution.title}"`,
                            );
                        }

                        return {
                            ...solution,
                            steps: filteredSteps,
                        };
                    })
                    .filter((solution: SolutionProposal) => solution.steps.length > 0); // Remove solutions with no valid steps

                const totalSolutions = filteredSolutions.length;

                this.logOperation('Solutions proposed', {
                    totalSolutions,
                    solutionsCount: filteredSolutions.length,
                    originalCount: rawSolutions.length,
                });

                return {
                    agentId: this.agentId,
                    success: true,
                    confidence: filteredSolutions.length > 0 ? proposal.confidence || 0.7 : 0.5,
                    solutions: filteredSolutions.length > 0 ? filteredSolutions : undefined,
                    totalSolutions,
                    metadata: {
                        model: this.model,
                        averageConfidence:
                            filteredSolutions.length > 0
                                ? filteredSolutions.reduce(
                                      (sum: number, s: SolutionProposal) =>
                                          sum + (s.confidence || 0.7),
                                      0,
                                  ) / filteredSolutions.length
                                : 0,
                        originalSolutionsCount: rawSolutions.length,
                    },
                };
            }

            const errorMessage =
                'error' in parseResult
                    ? parseResult.error
                    : 'Failed to parse solution proposal result';
            this.logError('Failed to parse solution proposal result', new Error(errorMessage));
            return {
                agentId: this.agentId,
                success: false,
                confidence: 0,
                error: errorMessage,
            };
        } catch (error) {
            this.logError('Error proposing solutions', error, { title: title.substring(0, 50) });
            return {
                agentId: this.agentId,
                success: false,
                confidence: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Build the solution proposal prompt
     */
    private buildProposalPrompt(
        title: string,
        description?: string,
        contentSummary?: string,
        webContent?: string,
        extractedActions?: ActionItem[],
    ): string {
        let taskText = `Task Title: ${title}`;
        if (description) {
            taskText += `\n\nTask Description:\n${description}`;
        }

        let contentText = '';
        if (webContent) {
            // Truncate web content to reasonable length for prompt (keep first 8000 chars)
            const truncatedContent =
                webContent.length > 8000
                    ? `${webContent.substring(0, 8000)}\n\n[Content truncated - showing first 8000 characters]`
                    : webContent;
            contentText = `\n\n[Content from URL]\n${truncatedContent}`;
        } else if (contentSummary) {
            contentText = `\n\n[Content Summary from URL]\n${contentSummary}`;
        }

        let actionsText = '';
        if (extractedActions && extractedActions.length > 0) {
            actionsText = '\n\n[Extracted Actions]\n';
            actionsText += extractedActions
                .map(
                    (action, idx) =>
                        `${idx + 1}. ${action.description}${action.priority ? ` (Priority: ${action.priority})` : ''}${action.estimatedDuration ? ` [Duration: ${action.estimatedDuration}]` : ''}`,
                )
                .join('\n');
            actionsText +=
                '\n\nUse these extracted actions to inform your solution proposals. Your solutions should help the user complete these specific actions effectively.';
        }

        return `You are a sophisticated expert problem solver and task supporter. Your role is to help humans complete tasks by proposing intelligent, meaningful solution approaches. You act as a knowledgeable colleague, not a trivial assistant.

Analyze the following task and propose multiple concrete solutions to help the user complete it successfully. Your goal is to provide sophisticated, actionable solution proposals that provide real value and guide the user toward task completion.

${taskText}${contentText}${actionsText}

Generate a JSON object with the following structure:

{
  "solutions": [
    {
      "title": "Solution name/title",
      "description": "Brief description of this solution approach",
      "approach": "Detailed explanation of how this solution works and why it's effective",
      "steps": ["step 1", "step 2", "step 3", ...],
      "pros": ["advantage 1", "advantage 2", ...],
      "cons": ["limitation 1", "limitation 2", ...],
      "estimatedEffort": "low" | "medium" | "high" | "X hours" | "X days",
      "confidence": number (0-1, how confident you are this solution will work)
    }
  ],
  "totalSolutions": number,
  "confidence": number (0-1, overall confidence in the proposals)
}

CRITICAL RULES - You are a sophisticated supporter:
- Propose 2-5 different solution approaches to give the user options
- Each solution should be practical, actionable, and provide real value
- Solutions should be distinct from each other - offer different approaches or strategies
- The "approach" field should explain the methodology and reasoning behind the solution in depth
- Steps should be clear, sequential, substantive actions the user can follow
- DO NOT include trivial steps such as:
  * "Open browser" or "Navigate to URL" (obvious and unhelpful)
  * "Read the documentation" or "View the content" (too generic)
  * "Click on link" or "Visit website" (trivial navigation)
  * Any step that is just about accessing content without doing something meaningful with it
- Focus on steps that involve: analysis, design, implementation, configuration, problem-solving, decision-making, or other substantive work
- Include pros and cons to help the user make an informed decision
- Estimate effort level to help with planning
- Set confidence based on how well the solution addresses the task requirements
- Use information from the provided content and extracted actions to inform your proposals
- If the task is complex, break solutions into manageable, sophisticated approaches
- If the task is simple, propose different methods, tools, or strategies that could be used
- Be creative but practical - solutions should be achievable and meaningful
- Consider different perspectives: technical solutions, process improvements, tool-based approaches, architectural decisions, etc.
- Think like an expert who understands the domain deeply
- Overall confidence should reflect how well you understand the task and how complete your solutions are

Examples of GOOD solution steps:
- "Analyze the requirements and identify key technical constraints"
- "Design the system architecture using microservices pattern"
- "Implement authentication using OAuth2 with JWT tokens"
- "Set up CI/CD pipeline with automated testing"
- "Create database migration scripts for schema changes"

Examples of BAD solution steps (trivial - DO NOT include):
- "Open the browser and navigate to the website"
- "Read the documentation"
- "Click on the link"
- "Visit the URL"
- "View the content"

Return only valid JSON, no markdown formatting.`;
    }
}
