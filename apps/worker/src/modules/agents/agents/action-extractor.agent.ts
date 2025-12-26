import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseAndValidateJson } from "@personal-kanban/shared";
import { actionExtractionResponseSchema } from "../../../shared/schemas/agent-schemas";
import {
  CONFIDENCE_THRESHOLDS,
  CONTENT_LIMITS,
  LLM_TEMPERATURE,
} from "../core/agent-constants";
import { BaseAgent } from "../core/base-agent";
import { filterTrivialActions } from "../utils/action-filter.util";

export interface ActionItem {
  description: string;
  priority?: "low" | "medium" | "high";
  estimatedDuration?: string;
}

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

export interface ActionExtractionResult {
  agentId: string;
  success: boolean;
  confidence?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  actions?: ActionItem[];
  totalActions?: number;
  solutions?: SolutionProposal[];
  totalSolutions?: number;
}

/**
 * Action Extractor Agent
 * Extracts actionable items from content summaries
 * Helps break down complex tasks into smaller actions
 * Works only on provided content - no invention
 */
@Injectable()
export class ActionExtractorAgent extends BaseAgent {
  readonly agentId = "action-extractor-agent";

  constructor(config: ConfigService) {
    super(config, ActionExtractorAgent.name);
  }

  /**
   * Extract actionable items and propose solutions from content
   * Solutions are based on the provided context (description, content summary, web content)
   */
  async extractActions(
    title: string,
    description?: string,
    contentSummary?: string,
    webContent?: string,
  ): Promise<ActionExtractionResult> {
    // Validate inputs
    const inputValidation = this.validateTaskInputs(title, description);
    if (!inputValidation.valid) {
      return this.createErrorResult<ActionExtractionResult>(
        inputValidation.error || "Invalid input",
      );
    }

    if (!contentSummary && !description) {
      // If no substantial content, try to extract from title alone
      return {
        agentId: this.agentId,
        success: true,
        confidence: CONFIDENCE_THRESHOLDS.LOW,
        actions: [
          {
            description: title,
            priority: "medium",
          },
        ],
        totalActions: 1,
        metadata: {
          extractedFrom: "title-only",
        },
      };
    }

    try {
      await this.ensureModel();

      const prompt = this.buildExtractionPrompt(
        title,
        description,
        contentSummary,
        webContent,
      );

      this.logOperation("Extracting actions", {
        title: title.substring(0, 50),
        hasDescription: !!description,
        hasContentSummary: !!contentSummary,
      });

      const extractionText = await this.generateLlmResponse(prompt, {
        context: "action extraction",
        format: "json",
        temperature: LLM_TEMPERATURE.MEDIUM,
      });

      // Parse and validate JSON (LLM response doesn't include agentId/success)
      const parseResult = parseAndValidateJson(
        extractionText,
        actionExtractionResponseSchema,
        {
          warn: (msg, ...args) => this.logger.warn(msg, ...args),
        },
        "action extraction",
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

        this.logOperation("Actions extracted", {
          totalActions,
          actionsCount: filteredActions.length,
          filteredCount,
        });

        const solutions = extraction.solutions || [];
        const totalSolutions = solutions.length;

        return {
          agentId: this.agentId,
          success: true,
          confidence:
            filteredActions.length > 0
              ? CONFIDENCE_THRESHOLDS.VERY_HIGH
              : CONFIDENCE_THRESHOLDS.MEDIUM,
          actions: filteredActions.length > 0 ? filteredActions : undefined,
          totalActions,
          solutions: totalSolutions > 0 ? solutions : undefined,
          totalSolutions: totalSolutions > 0 ? totalSolutions : undefined,
          metadata: {
            model: this.model,
            filteredCount,
            originalCount: rawActions.length,
            solutionsCount: totalSolutions,
          },
        };
      }

      const errorMessage =
        "error" in parseResult
          ? parseResult.error
          : "Failed to parse action extraction result";
      this.logError(
        "Failed to parse action extraction result",
        new Error(errorMessage),
      );
      return this.createErrorResult<ActionExtractionResult>(errorMessage);
    } catch (error) {
      this.logError("Error extracting actions", error, {
        title: title,
      });
      return this.createErrorResult<ActionExtractionResult>(
        this.extractErrorMessage(error),
      );
    }
  }

  /**
   * Build the action extraction prompt
   */
  private buildExtractionPrompt(
    title: string,
    description?: string,
    contentSummary?: string,
    webContent?: string,
  ): string {
    let content = this.buildContentString(title, description, contentSummary);
    if (webContent && webContent !== contentSummary) {
      // Include full web content if available and different from summary for richer context
      content += `\n\n[Full Web Content Context]\n${webContent.substring(0, CONTENT_LIMITS.WEB_CONTENT_MAX)}`;
    }

    return `You are a work preparation assistant. Your role is to help humans prepare to execute work by:
1. Breaking tasks down into actionable steps
2. Proposing solution approaches based on the context

Extract actionable items AND propose solution approaches from the following task. Return a JSON object:

{
  "actions": [
    {
      "description": "specific action item",
      "priority": "low" or "medium" or "high",
      "estimatedDuration": "30 minutes"
    }
  ],
  "totalActions": 3,
  "solutions": [
    {
      "title": "Solution name",
      "description": "Brief description of the solution approach",
      "approach": "Detailed explanation of how this solution works",
      "steps": ["First step as a string", "Second step as a string", "Third step as a string"],
      "pros": ["advantage 1", "advantage 2"],
      "cons": ["limitation 1", "limitation 2"],
      "estimatedEffort": "2-3 hours",
      "confidence": 0.8
    }
  ],
  "totalSolutions": 2
}

IMPORTANT: The "steps" field must be an array of strings. Each step must be a plain string, not an object or nested array. Example: ["Install dependencies", "Configure settings", "Test the implementation"]

Task:
${content}

PREPARATION FOCUS - Help prepare work for execution:

ACTIONS (required):
- Break down work into meaningful, executable steps (1-10 actions)
- Each action should be concrete, completable, and provide real value
- DO NOT include trivial actions like "Open browser", "Navigate to URL", "Read the content", "Click on link"
- Focus on substantive work: analysis, decision-making, creation, implementation, configuration, problem-solving
- Assign priority based on importance and logical execution order
- Estimate duration for each action if possible
- Only extract actions from the provided content - do not invent

SOLUTIONS (based on context):
- Propose 1-3 solution approaches that could be used to execute this work
- Base solutions on the context provided (task description, content summary, etc.)
- Each solution should include:
  * Clear title and description
  * Detailed approach explaining how it works
  * Concrete steps to implement it
  * Pros and cons to help choose between options
  * Estimated effort required
  * Confidence level (0-1) based on how well it fits the context
- Solutions should be practical and executable based on the given context
- If the task is straightforward, you may propose 1 solution
- If the task is complex or has multiple valid approaches, propose 2-3 options
- Think like a knowledgeable colleague proposing different ways to approach the work

Examples of GOOD actions:
- "Analyze the requirements and identify key constraints"
- "Design the database schema based on the specifications"
- "Implement authentication middleware using OAuth2"

Examples of GOOD solutions:
- Solution for "Build user authentication": Propose OAuth2 vs JWT vs session-based approaches with pros/cons
- Solution for "Migrate database": Propose incremental vs full migration with steps and trade-offs

Return only valid JSON, no markdown formatting.`;
  }
}
