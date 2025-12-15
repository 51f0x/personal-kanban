import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseAndValidateJson } from "@personal-kanban/shared";
import { TaskContext } from "@prisma/client";
import { contextExtractionResponseSchema } from "../../../shared/schemas/agent-schemas";
import {
  validateDescription,
  validateTitle,
} from "../../../shared/utils/input-validator.util";
import { ActionItem } from "./action-extractor.agent";
import { BaseAgent } from "../core/base-agent";

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
  readonly agentId = "context-extractor-agent";

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

      const prompt = this.buildExtractionPrompt(
        title,
        description,
        contentSummary,
        suggestedActions,
      );

      this.logOperation("Extracting context", {
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
              temperature: 0.4, // Lower temperature for more consistent extraction
            },
          }),
        "context extraction",
      );

      const extractionText = response.response || "";

      // Parse and validate JSON (LLM response doesn't include agentId/success)
      const parseResult = parseAndValidateJson(
        extractionText,
        contextExtractionResponseSchema,
        {
          warn: (msg, ...args) => this.logger.warn(msg, ...args),
        },
        "context extraction",
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
            hasSuggestedActions:
              !!suggestedActions && suggestedActions.length > 0,
            actionsCount: suggestedActions?.length || 0,
          },
        };
      }

      const errorMessage =
        "error" in parseResult
          ? parseResult.error
          : "Failed to parse extraction result";
      this.logError(
        "Failed to parse extraction result",
        new Error(errorMessage),
      );
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: errorMessage,
      };
    } catch (error) {
      this.logError("Error extracting context", error, {
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

    let actionsText = "";
    if (suggestedActions && suggestedActions.length > 0) {
      actionsText = "\n\n[Suggested Actions to Guide Extraction]\n";
      actionsText += suggestedActions
        .map(
          (action, idx) =>
            `${idx + 1}. ${action.description}${action.priority ? ` (Priority: ${action.priority})` : ""}${action.estimatedDuration ? ` [Duration: ${action.estimatedDuration}]` : ""}`,
        )
        .join("\n");
      actionsText +=
        "\n\nUse these suggested actions to inform your context extraction. Consider what context, tags, and project hints would be most relevant given these actions.";
    }

    return `You are a work categorization assistant. Extract context, tags, and project hints to help organize and prepare work tasks for human execution.

Extract categorization metadata from the following task content. Return a JSON object:

{
  "context": "EMAIL" or "MEETING" or "PHONE" or "READ" or "WATCH" or "DESK" or "OTHER" or null,
  "tags": ["tag1", "tag2", "tag3"] or [],
  "projectHints": ["hint1", "hint2"] or [] (NIE null! Immer Array, auch wenn leer []),
  "estimatedDuration": "30 minutes" or null,
  "confidence": 0.8
}

Task Content:
${content}${actionsText}

PREPARATION FOCUS - Help organize work:
1. **Context**: Identify where/when this work should be done (EMAIL for email work, MEETING for meetings, READ for reading, DESK for computer work, etc.) to help organize workflow
2. **Tags**: Extract relevant tags that help categorize, find, and organize the task
3. **Project Hints**: Suggest project associations if this work is part of a larger effort
4. **Duration**: Estimate time needed to help with planning and scheduling

Rules:
- Your goal is to categorize and organize work to help humans prepare and execute it efficiently
- Set "context" based on where/when the work should be done to help organize workflow (EMAIL, MEETING, READ, DESK, etc.)
- Extract 3-7 relevant tags (lowercase, hyphenated) that help categorize, search, and organize the task
- Suggest 0-3 project hints if the task seems part of a larger project (helps connect related work)
- Estimate duration in human-readable format (e.g., "30 minutes", "1-2 hours") to help with planning
- Set confidence based on how clear the categorization indicators are (0.7-0.95 typical)
- Only use information from the provided content - do not invent
- If suggested actions are provided, use them to guide extraction - align context, tags, and project hints with the actions
- Focus on making work easy to find, organize, and prioritize

IMPORTANT JSON FORMAT RULES:
- "projectHints" must ALWAYS be an array: use [] (empty array) if there are no hints, NEVER use null
- "tags" must ALWAYS be an array: use [] (empty array) if there are no tags, NEVER use null
- Arrays cannot contain empty strings - if an array is empty, use [] not ["", ""]

Return only valid JSON, no markdown formatting.`;
  }
}
