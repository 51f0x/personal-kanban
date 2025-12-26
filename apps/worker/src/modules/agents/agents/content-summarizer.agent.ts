import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseAndValidateJson } from "@personal-kanban/shared";
import { summarizationResponseSchema } from "../../../shared/schemas/agent-schemas";
import {
  INPUT_LIMITS,
  validateContentSize,
} from "../../../shared/utils/input-validator.util";
import {
  AGENT_DEFAULTS,
  CONFIDENCE_THRESHOLDS,
  LLM_TEMPERATURE,
} from "../core/agent-constants";
import { BaseAgent } from "../core/base-agent";

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
  readonly agentId = "content-summarizer-agent";

  readonly maxLength = AGENT_DEFAULTS.SUMMARY_LENGTH;
  readonly minLength = AGENT_DEFAULTS.MIN_SUMMARY_LENGTH;

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
    maxLength = AGENT_DEFAULTS.SUMMARY_LENGTH,
    taskTitle?: string,
    taskDescription?: string,
  ): Promise<SummarizationResult> {
    if (!content || content.trim().length === 0) {
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: "No content to summarize",
        originalLength: 0,
        summary: "",
      };
    }

    // Validate content size
    const validation = validateContentSize(content);
    if (!validation.valid) {
      this.logError(
        "Content validation failed",
        new Error(validation.error || "Invalid content"),
      );
      return this.createErrorResult<SummarizationResult>(
        validation.error || "Content validation failed",
        {
          originalLength: content.length,
          summary: "",
        } as Partial<SummarizationResult>,
      );
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

      this.logOperation("Summarizing content", {
        originalLength,
        targetWords: maxLength,
        truncated: content.length !== contentToSummarize.length,
      });

      const summaryText = await this.generateLlmResponse(prompt, {
        context: "content summarization",
        format: "json",
        temperature: LLM_TEMPERATURE.CONSISTENT, // Lower temperature for factual summarization
      });

      // Parse and validate JSON (LLM response doesn't include agentId/success/originalLength/wordCount)
      const parseResult = parseAndValidateJson(
        summaryText,
        summarizationResponseSchema,
        {
          warn: (msg, ...args) => this.logger.warn(msg, ...args),
        },
        "content summarization",
      );

      if (parseResult.success) {
        const parsed = parseResult.data;
        const wordCount =
          parsed.wordCount || parsed.summary.split(/\s+/).length;

        this.logOperation("Content summarized", {
          wordCount,
          keyPointsCount: parsed.keyPoints?.length || 0,
          compressionRatio:
            originalLength > 0 ? parsed.summary.length / originalLength : 0,
        });

        return {
          agentId: this.agentId,
          success: true,
          confidence:
            parsed.summary.length > 0
              ? CONFIDENCE_THRESHOLDS.EXCELLENT
              : CONFIDENCE_THRESHOLDS.MEDIUM,
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
        "error" in parseResult ? parseResult.error : "Unknown validation error";
      this.logger.warn(
        "JSON validation failed, using raw response as summary",
        {
          error: errorMessage,
        },
      );
      const fallbackSummary = summaryText.trim();
      return {
        agentId: this.agentId,
        success: true,
        confidence: CONFIDENCE_THRESHOLDS.MEDIUM_HIGH,
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
      this.logError("Error summarizing content", error, {
        contentLength: content.length,
      });
      return this.createErrorResult<SummarizationResult>(
        this.extractErrorMessage(error),
        {
          originalLength: content.length,
          summary: "",
        } as Partial<SummarizationResult>,
      );
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
    let taskContext = "";
    if (taskTitle || taskDescription) {
      taskContext = "\n\nTask to perform:\n";
      if (taskTitle) {
        taskContext += `Title: ${taskTitle}\n`;
      }
      if (taskDescription) {
        taskContext += `Description: ${taskDescription}\n`;
      }
      taskContext +=
        "\nYour goal is to summarize the content below in a way that helps the human perform this specific task. Focus on information that is relevant to completing the task.";
    }

    return `You are a content summarizer for work preparation. Summarize web content to help humans understand context and prepare to execute work tasks.${taskContext}

Rules:
- Only use information from the provided content - do not invent or add information
- Create a summary of approximately ${maxLength} words that provides relevant context
- Extract all key points that are relevant to the work task, even if they are not directly related to the task
- Focus on actionable information, important facts, and context needed to prepare for the work
- Preserve important details like dates, names, numbers, and specific requirements
- If a task is provided, prioritize information that helps prepare to execute that task
- Guide the reader toward what they need to know to approach the work effectively
- Think: "What context does the human need to understand before starting this work?"

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
