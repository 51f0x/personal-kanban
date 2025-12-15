/**
 * @deprecated TODO: DELETE ASAP - This class is not used anywhere in the codebase.
 * It's registered in agents.module.ts but never injected or called.
 * Remove this file and its registration from agents.module.ts
 */

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseAndValidateJson } from "@personal-kanban/shared";
import { taskHelpResponseSchema } from "../../../shared/schemas/agent-schemas";
import { validateDescription } from "../../../shared/utils/input-validator.util";
import { ActionItem } from "./action-extractor.agent";
import { BaseAgent } from "../core/base-agent";

export interface TaskHelpResult {
  agentId: string;
  success: boolean;
  confidence?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  helpText?: string;
  keySteps?: string[];
  prerequisites?: string[];
  resources?: string[];
}

/**
 * Task Help Agent
 * Generates comprehensive, actionable help text from web content to guide users in completing tasks
 * Analyzes the task and downloaded content to create complete guidance
 */
@Injectable()
export class TaskHelpAgent extends BaseAgent {
  readonly agentId = "task-help-agent";

  constructor(config: ConfigService) {
    super(config, TaskHelpAgent.name);
  }

  /**
   * Generate actionable help text from task and web content
   * Creates comprehensive guidance that allows the user to complete the task
   * Uses suggested actions to structure and guide the help text
   */
  async generateHelp(
    title: string,
    description?: string,
    webContent?: string,
    contentSummary?: string,
    suggestedActions?: ActionItem[],
  ): Promise<TaskHelpResult> {
    // Only generate help if we have web content or content summary
    if (!webContent && !contentSummary) {
      this.logger.debug("Skipping help generation - no web content available");
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: "No web content available for help generation",
      };
    }

    try {
      await this.ensureModel();

      const prompt = this.buildHelpPrompt(
        title,
        description,
        webContent,
        contentSummary,
        suggestedActions,
      );

      this.logOperation("Generating task help", {
        title: title.substring(0, 50),
        hasDescription: !!description,
        hasWebContent: !!webContent,
        hasContentSummary: !!contentSummary,
        hasActions: !!suggestedActions && suggestedActions.length > 0,
        actionsCount: suggestedActions?.length || 0,
        webContentLength: webContent?.length || 0,
      });

      const response = await this.callLlm(
        () =>
          this.ollama.generate({
            model: this.model,
            prompt,
            stream: false,
            format: "json",
            options: {
              temperature: 0.7, // Slightly higher for creative but focused help
            },
          }),
        "task help generation",
      );

      const helpText = response.response || "";

      // Parse and validate JSON
      const parseResult = parseAndValidateJson(
        helpText,
        taskHelpResponseSchema,
        {
          warn: (msg, ...args) => this.logger.warn(msg, ...args),
        },
        "task help",
      );

      if (parseResult.success) {
        const help = parseResult.data;
        const helpTextContent = help.helpText || "";

        // Validate help text
        if (helpTextContent.trim().length === 0) {
          this.logError(
            "Empty help text generated",
            new Error("Help text is empty"),
          );
          return {
            agentId: this.agentId,
            success: false,
            confidence: 0,
            error: "Generated help text is empty",
          };
        }

        // Validate description length if needed
        const descValidation = validateDescription(helpTextContent);
        if (!descValidation.valid) {
          this.logger.warn(
            `Help text validation warning: ${descValidation.error}. Truncating if needed.`,
          );
        }

        return {
          agentId: this.agentId,
          success: true,
          confidence: help.confidence || 0.7,
          helpText: this.validateAndTruncateContent(helpTextContent),
          keySteps: help.keySteps || [],
          prerequisites: help.prerequisites || [],
          resources: help.resources || [],
          metadata: {
            model: this.model,
            hasWebContent: !!webContent,
            hasContentSummary: !!contentSummary,
            hasSuggestedActions:
              !!suggestedActions && suggestedActions.length > 0,
            actionsCount: suggestedActions?.length || 0,
            helpTextLength: helpTextContent.length,
            keyStepsCount: help.keySteps?.length || 0,
          },
        };
      }

      const errorMessage =
        "error" in parseResult
          ? parseResult.error
          : "Failed to parse help result";
      this.logError("Failed to parse help result", new Error(errorMessage), {
        rawResponse: helpText,
      });
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: errorMessage,
        metadata: {
          rawResponse: helpText,
        },
      };
    } catch (error) {
      this.logError("Error generating task help", error, {
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
   * Build the help generation prompt
   */
  private buildHelpPrompt(
    title: string,
    description?: string,
    webContent?: string,
    contentSummary?: string,
    suggestedActions?: ActionItem[],
  ): string {
    let taskText = `Task Title: ${title}`;
    if (description) {
      taskText += `\n\nTask Description:\n${description}`;
    }

    let contentText = "";
    if (webContent) {
      // Truncate web content to reasonable length for prompt (keep first 10000 chars)
      const truncatedContent =
        webContent.length > 10000
          ? `${webContent.substring(0, 10000)}\n\n[Content truncated - showing first 10000 characters]`
          : webContent;
      contentText = `\n\nContent from URL:\n${truncatedContent}`;
    } else if (contentSummary) {
      contentText = `\n\nContent Summary from URL:\n${contentSummary}`;
    }

    let actionsText = "";
    if (suggestedActions && suggestedActions.length > 0) {
      actionsText = "\n\n[Suggested Actions to Structure Help]\n";
      actionsText += suggestedActions
        .map(
          (action, idx) =>
            `${idx + 1}. ${action.description}${action.priority ? ` (Priority: ${action.priority})` : ""}${action.estimatedDuration ? ` [Duration: ${action.estimatedDuration}]` : ""}`,
        )
        .join("\n");
      actionsText +=
        "\n\nUse these suggested actions to structure your help text. Align your help content, key steps, prerequisites, and resources with these actions. Ensure your help text guides the user through completing these specific actions.";
    }

    return `You are a sophisticated task support assistant. Your role is to help humans complete tasks by providing comprehensive, meaningful guidance. You act as a knowledgeable supporter who understands the task deeply, not a trivial assistant.

Analyze the task and the provided content from a URL, then generate detailed help that:
1. Explains what needs to be done clearly and with depth
2. Provides step-by-step guidance that focuses on substantive work
3. Includes all necessary information from the content
4. Ensures the user has everything needed to complete the task
5. Is complete enough that the user can finish the task without needing to revisit the original URL

Task Information:
${taskText}${contentText}${actionsText}

Generate a JSON object with the following structure:

{
  "helpText": string (comprehensive help text that guides the user to complete the task - should be detailed and complete, incorporating relevant information from the content),
  "keySteps": string[] (3-7 key steps the user needs to follow, extracted from the content),
  "prerequisites": string[] (things the user needs before starting - tools, accounts, information, etc.),
  "resources": string[] (helpful resources mentioned in the content - links, tools, documentation, etc.),
  "confidence": number (0-1, how confident you are that this help is complete and accurate)
}

CRITICAL RULES - You are a sophisticated supporter:
- The helpText MUST be comprehensive and complete - it should contain all the information from the content that the user needs to complete the task
- Extract and include specific details, instructions, requirements, and steps from the content
- Make the help actionable - use clear, direct language focused on substantive work
- Include relevant context, requirements, and constraints from the content
- The help should be self-contained - the user should be able to complete the task using only this help text
- Key steps should be clear, sequential, substantive actions
- DO NOT include trivial steps such as:
  * "Open browser" or "Navigate to URL" (obvious and unhelpful)
  * "Read the content" or "View the page" (too generic)
  * "Click on link" or "Visit website" (trivial navigation)
  * Any step that is just about accessing content without doing something meaningful with it
- Focus on steps that involve: analysis, design, implementation, configuration, problem-solving, decision-making, or other substantive work
- Prerequisites should list what's needed before starting (tools, accounts, information, etc.)
- Resources should include any tools, links, or documentation mentioned
- Set confidence based on how complete and accurate the help is (higher if you extracted all necessary information)
- Only use information from the provided task and content - do not invent information
- If the content is incomplete or unclear, note that in the help text and set lower confidence
- If suggested actions are provided, structure your help text around these actions - ensure your help guides the user through completing each suggested action
- Align your key steps with the suggested actions when available, providing detailed guidance for each action
- Include prerequisites and resources that are specifically needed for the suggested actions
- Think like an expert who understands the domain and can provide sophisticated guidance

Examples of GOOD key steps:
- "Analyze the requirements and identify key technical constraints"
- "Design the system architecture based on scalability needs"
- "Implement authentication using OAuth2 with proper token management"
- "Configure the database with appropriate indexes for performance"
- "Write comprehensive unit tests covering edge cases"

Examples of BAD key steps (trivial - DO NOT include):
- "Open the browser and navigate to the website"
- "Read the documentation"
- "Click on the link"
- "Visit the URL"

Return only valid JSON, no markdown formatting.`;
  }
}
