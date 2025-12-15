import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseAndValidateJson } from "@personal-kanban/shared";
import { TaskContext } from "@prisma/client";
import { taskAnalysisResponseSchema } from "../../../shared/schemas/agent-schemas";
import {
  validateDescription,
  validateTitle,
} from "../../../shared/utils/input-validator.util";
import { ActionItem } from "./action-extractor.agent";
import { BaseAgent } from "../core/base-agent";

export interface TaskAnalysisResult {
  agentId: string;
  success: boolean;
  confidence?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  context?: TaskContext;
  waitingFor?: string;
  dueAt?: string;
  needsBreakdown?: boolean;
  suggestedTags?: string[];
  priority?: "low" | "medium" | "high";
  estimatedDuration?: string;
  suggestedTitle?: string;
  suggestedDescription?: string;
}

/**
 * Task Analyzer Agent
 * Analyzes tasks and extracts metadata using LLM
 * Enhanced to work with summarized content and actual task data
 */
@Injectable()
export class TaskAnalyzerAgent extends BaseAgent {
  readonly agentId = "task-analyzer-agent";

  constructor(config: ConfigService) {
    super(config, TaskAnalyzerAgent.name);
  }

  /**
   * Analyze a task with optional content summary and suggested actions
   * Works only on provided data - no invention
   * Uses suggested actions to guide the analysis
   */
  async analyzeTask(
    title: string,
    description?: string,
    contentSummary?: string,
    suggestedActions?: ActionItem[],
  ): Promise<TaskAnalysisResult> {
    // Validate inputs
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      this.logError(
        "Title validation failed",
        new Error(titleValidation.error || "Invalid title"),
      );
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: titleValidation.error || "Invalid title",
      };
    }

    if (description) {
      const descValidation = validateDescription(description);
      if (!descValidation.valid) {
        this.logError(
          "Description validation failed",
          new Error(descValidation.error || "Invalid description"),
        );
        return {
          agentId: this.agentId,
          success: false,
          confidence: 0,
          error: descValidation.error || "Invalid description",
        };
      }
    }

    try {
      await this.ensureModel();

      const prompt = this.buildAnalysisPrompt(
        title,
        description,
        contentSummary,
        suggestedActions,
      );

      this.logOperation("Analyzing task", {
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
            format: "json",
            options: {
              temperature: 0.5, // Moderate temperature for balanced analysis
            },
          }),
        "task analysis",
      );

      const analysisText = response.response || "";

      // Parse and validate JSON (LLM response doesn't include agentId/success)
      const parseResult = parseAndValidateJson(
        analysisText,
        taskAnalysisResponseSchema,
        {
          warn: (msg, ...args) => this.logger.warn(msg, ...args),
        },
        "task analysis",
      );

      if (parseResult.success) {
        const analysis = parseResult.data;
        return {
          agentId: this.agentId,
          success: true,
          confidence: analysis.confidence || 0.7,
          ...analysis,
          metadata: {
            ...(analysis.metadata || {}),
            model: this.model,
            hasContentSummary: !!contentSummary,
            hasSuggestedActions:
              !!suggestedActions && suggestedActions.length > 0,
            actionsCount: suggestedActions?.length || 0,
          },
        };
      }

      const errorMessage =
        "error" in parseResult
          ? parseResult.error
          : "Failed to parse analysis result";
      this.logError(
        "Failed to parse analysis result",
        new Error(errorMessage),
        {
          rawResponse: analysisText,
        },
      );
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: errorMessage,
        metadata: {
          rawResponse: analysisText,
        },
      };
    } catch (error) {
      this.logError("Error analyzing task", error, {
        title: title,
      });
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Build the analysis prompt
   */
  private buildAnalysisPrompt(
    title: string,
    description?: string,
    contentSummary?: string,
    suggestedActions?: ActionItem[],
  ): string {
    let taskText = title;
    if (description) {
      taskText += `\n\n${description}`;
    }
    if (contentSummary) {
      taskText += `\n\n[Content Summary from URL]\n${contentSummary}`;
    }

    let actionsText = "";
    if (suggestedActions && suggestedActions.length > 0) {
      actionsText = "\n\n[Suggested Actions to Guide Analysis]\n";
      actionsText += suggestedActions
        .map(
          (action, idx) =>
            `${idx + 1}. ${action.description}${action.priority ? ` (Priority: ${action.priority})` : ""}${action.estimatedDuration ? ` [Duration: ${action.estimatedDuration}]` : ""}`,
        )
        .join("\n");
      actionsText +=
        "\n\nUse these suggested actions to inform your analysis. Consider how these actions relate to the task context, priority, tags, and duration.";
    }

    return `You are a work preparation assistant. Your role is to PRE-ANALYZE tasks and prepare them for human execution. You help humans understand what work needs to be done and how to approach it effectively.

Analyze the following task and prepare a clear, actionable work description with helpful metadata. Return a JSON object with the following structure:

{
  "suggestedTitle": "Clear task title",
  "suggestedDescription": "Detailed description of the work" or null,
  "context": "EMAIL" or "MEETING" or "PHONE" or "READ" or "WATCH" or "DESK" or "OTHER" or null,
  "waitingFor": "Person or thing blocking this" or null,
  "dueAt": "2024-12-31T23:59:59Z" or null,
  "needsBreakdown": true or false,
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "priority": "low" or "medium" or "high" or null,
  "estimatedDuration": "30 minutes" or null,
  "confidence": 0.8
}

Task:
${taskText}${actionsText}

PREPARATION FOCUS - Help the human prepare to execute this work:
1. **Title**: Create a clear, concise title that immediately communicates what work needs to be done
2. **Description**: Write an executable work description that:
   - Clearly states the objective and expected outcome
   - Includes relevant context from web content summaries when available
   - Provides enough information to start working without ambiguity
   - Guides the human on what to focus on
3. **Context**: Identify where/when this work should be done (EMAIL, MEETING, READ, DESK, etc.) to help organize workflow
4. **Metadata**: Extract tags, priority, duration, and dependencies to help with planning and organization

Rules:
- Your goal is PREPARATION - help the human understand and prepare to execute the work, not to complete it
- Use content summaries to provide relevant background context in the description
- Set "context" based on where/when the work should be done (EMAIL for email-related, MEETING for meetings, READ for reading, DESK for computer work, etc.)
- Set "waitingFor" if the task is blocked by someone or something else
- Set "dueAt" if there's a clear deadline (ISO format: YYYY-MM-DDTHH:mm:ssZ)
- Set "needsBreakdown" to true if the task is complex and benefits from being broken into smaller steps
- Suggest 3-5 relevant tags (lowercase, hyphenated) that help categorize and find the task
- Set priority based on urgency and importance to help prioritize work
- Estimate duration in human-readable format (e.g., "30 minutes", "2 hours") to help with time planning
- Set confidence between 0 and 1 based on certainty of your analysis
- Only use information from the provided task and content - do not invent information
- If suggested actions are provided, use them to inform your analysis (align tags, priority, duration with actions)
- Focus on making the work description actionable and clear - the human should know what to do

Return only valid JSON, no markdown formatting.`;
  }
}
