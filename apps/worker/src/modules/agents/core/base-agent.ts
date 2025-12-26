import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type RetryOptions,
  retryWithBackoff,
  withTimeout,
} from "@personal-kanban/shared";
import { Ollama } from "ollama";
import OpenAI from "openai";
import {
  INPUT_LIMITS,
  validateDescription,
  validateTitle,
} from "../../../shared/utils/input-validator.util";

/**
 * Base class for all agents
 * Provides common functionality: model management, LLM calls with timeout/retry
 */
@Injectable()
export abstract class BaseAgent {
  protected readonly logger: Logger;
  protected readonly ollama: Ollama;
  protected readonly openaiClient?: InstanceType<typeof OpenAI>;
  protected readonly model: string;
  protected readonly endpoint: string;
  protected readonly llmTimeoutMs: number;
  protected readonly maxRetries: number;
  protected readonly llmProvider: "ollama" | "openai";

  abstract readonly agentId: string;

  constructor(config: ConfigService, loggerContext: string) {
    this.logger = new Logger(loggerContext);
    this.endpoint = config.get<string>(
      "LLM_ENDPOINT",
      "http://localhost:11434",
    );
    this.model = config.get<string>("LLM_MODEL", "gemma3:1b");
    this.llmTimeoutMs = config.get<number>("LLM_TIMEOUT_MS", 120000); // 120s default
    this.maxRetries = config.get<number>("LLM_MAX_RETRIES", 2);
    const provider = config.get<string>("LLM_PROVIDER", "ollama");
    this.llmProvider = provider === "openai" ? "openai" : "ollama";

    // Initialize provider clients
    this.ollama = new Ollama({ host: this.endpoint });

    if (this.llmProvider === "openai") {
      const apiKey = config.get<string>("OPENAI_API_KEY");
      if (!apiKey) {
        this.logger.warn(
          "LLM_PROVIDER is set to 'openai' but OPENAI_API_KEY is not configured",
        );
      } else {
        const openaiBaseUrl = config.get<string>("OPENAI_BASE_URL");
        if (!openaiBaseUrl) {
          this.logger.log(
            "OPENAI_BASE_URL not set - using default OpenAI API URL",
          );
        }

        this.openaiClient = new OpenAI({
          apiKey,
          ...(openaiBaseUrl ? { baseURL: openaiBaseUrl } : {}),
        });
      }
    }
  }

  /**
   * Ensure the model is available, pull it if necessary
   */
  protected async ensureModel(): Promise<void> {
    if (this.llmProvider !== "ollama") {
      // OpenAI (and other hosted providers) don't require local model management
      return;
    }

    try {
      const listResponse = await this.ollama.list();
      const models = listResponse.models || [];
      const modelExists = models.some(
        (m: { name: string }) => m.name === this.model,
      );

      if (!modelExists) {
        this.logger.log(`Model ${this.model} not found, attempting to pull...`);
        try {
          await withTimeout(
            this.ollama.pull({
              model: this.model,
              stream: false,
            }),
            this.llmTimeoutMs * 2, // Longer timeout for model pull
            `Model pull timed out after ${this.llmTimeoutMs * 2}ms`,
          );
          this.logger.log(`Model ${this.model} pulled successfully`);
        } catch (pullError) {
          const errorMessage =
            pullError instanceof Error ? pullError.message : String(pullError);
          this.logger.warn(
            `Failed to pull model ${this.model}: ${errorMessage}`,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not ensure model availability: ${errorMessage}`);
      // Continue anyway - the model might still work
    }
  }

  /**
   * Call LLM with timeout and retry logic
   */
  protected async callLlm<T>(
    generateFn: () => Promise<T>,
    context: string,
  ): Promise<T> {
    return retryWithBackoff(
      () =>
        withTimeout(
          generateFn(),
          this.llmTimeoutMs,
          `LLM call (${context}) timed out after ${this.llmTimeoutMs}ms`,
        ),
      {
        maxAttempts: this.maxRetries + 1,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        retryableErrors: (error) => {
          const message = error.message.toLowerCase();
          const isRetryable =
            message.includes("timeout") ||
            message.includes("timed out") ||
            message.includes("network") ||
            message.includes("connection") ||
            message.includes("econnrefused") ||
            message.includes("etimedout") ||
            message.includes("eai_again") ||
            message.includes("temporary");
          return isRetryable;
        },
        logger: {
          warn: (msg, ...args) =>
            this.logger.warn(`[${context}] ${msg}`, ...args),
          error: (msg, ...args) =>
            this.logger.error(`[${context}] ${msg}`, ...args),
        },
      } as RetryOptions,
    );
  }

  /**
   * Unified LLM call helper that abstracts over Ollama vs OpenAI.
   * Most agents should use this instead of calling provider SDKs directly.
   */
  protected async generateLlmResponse(
    prompt: string,
    options: {
      /**
       * Logical operation / context name for logging and retries
       */
      context: string;
      /**
       * Desired response format – currently "json" or "text"
       */
      format?: "json" | "text";
      /**
       * Optional temperature knob (provider specific; default low for determinism)
       */
      temperature?: number;
    },
  ): Promise<string> {
    const { context, format = "text", temperature = 0.2 } = options;

    if (this.llmProvider === "ollama") {
      await this.ensureModel();
      return this.callLlm(
        async () => {
          const result = await this.ollama.generate({
            model: this.model,
            prompt,
            // Ollama treats undefined as "normal text"; "json" enables JSON mode
            format: format === "json" ? "json" : undefined,
            options:
              typeof temperature === "number"
                ? { temperature }
                : undefined,
          } as {
            model: string;
            prompt: string;
            format?: "json";
            options?: { temperature?: number };
          });
          return result.response;
        },
        context,
      );
    }

    // OpenAI path
    if (!this.openaiClient) {
      throw new Error(
        "OpenAI client not initialized. Check OPENAI_API_KEY and LLM_PROVIDER configuration.",
      );
    }

    return this.callLlm(
      async () => {
        const completion = await this.openaiClient.chat.completions.create({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          response_format:
            format === "json" ? { type: "json_object" } : undefined,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Empty response from OpenAI chat.completions");
        }
        return content;
      },
      context,
    );
  }

  /**
   * Validate and truncate content if needed
   */
  protected validateAndTruncateContent(
    content: string,
    maxLength: number = INPUT_LIMITS.CONTENT_MAX_LENGTH,
  ): string {
    if (content.length <= maxLength) {
      return content;
    }

    this.logger.warn(
      `Content truncated from ${content.length} to ${maxLength} characters`,
    );
    return `${content.substring(0, maxLength)}\n\n[Content truncated for processing]`;
  }

  /**
   * Log agent operation with context
   */
  protected logOperation(
    operation: string,
    context?: Record<string, unknown>,
  ): void {
    const logContext = {
      agentId: this.agentId,
      model: this.model,
      ...context,
    };
    this.logger.log(`${operation}`, logContext);
  }

  /**
   * Log agent error with context
   */
  protected logError(
    operation: string,
    error: Error | unknown,
    context?: Record<string, unknown>,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logContext = {
      agentId: this.agentId,
      model: this.model,
      error: errorMessage,
      ...context,
    };
    this.logger.error(
      `${operation} failed`,
      error instanceof Error ? error.stack : undefined,
      logContext,
    );
  }

  /**
   * Validate title with standardized error handling
   * @returns Validation result or throws error if invalid
   */
  protected validateTitleInput(
    title: string,
    context?: Record<string, unknown>,
  ): { valid: boolean; error?: string } {
    const validation = validateTitle(title);
    if (!validation.valid) {
      this.logError(
        "Title validation failed",
        new Error(validation.error || "Invalid title"),
        { title: title.substring(0, 50), ...context },
      );
    }
    return validation;
  }

  /**
   * Validate description with standardized error handling
   * @returns Validation result or throws error if invalid
   */
  protected validateDescriptionInput(
    description: string | undefined,
    context?: Record<string, unknown>,
  ): { valid: boolean; error?: string } {
    if (!description) {
      return { valid: true };
    }
    const validation = validateDescription(description);
    if (!validation.valid) {
      this.logError(
        "Description validation failed",
        new Error(validation.error || "Invalid description"),
        context,
      );
    }
    return validation;
  }

  /**
   * Validate title and description inputs together
   * @returns Combined validation result
   */
  protected validateTaskInputs(
    title: string,
    description?: string,
    context?: Record<string, unknown>,
  ): { valid: boolean; error?: string } {
    const titleValidation = this.validateTitleInput(title, context);
    if (!titleValidation.valid) {
      return titleValidation;
    }

    if (description !== undefined) {
      const descValidation = this.validateDescriptionInput(
        description,
        context,
      );
      if (!descValidation.valid) {
        return descValidation;
      }
    }

    return { valid: true };
  }

  /**
   * Create standardized error result for agent operations
   */
  protected createErrorResult<T extends { agentId: string; success: boolean }>(
    error: string | Error,
    additionalFields?: Partial<T>,
  ): T {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      agentId: this.agentId,
      success: false as const,
      confidence: 0,
      error: errorMessage,
      ...additionalFields,
    } as unknown as T;
  }

  /**
   * Extract error message from unknown error type
   */
  protected extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Unknown error";
  }

  /**
   * Build content string from title, description, and optional summary
   */
  protected buildContentString(
    title: string,
    description?: string,
    contentSummary?: string,
  ): string {
    let content = title;
    if (description) {
      content += `\n\n${description}`;
    }
    if (contentSummary) {
      content += `\n\n[Content Summary from URL]\n${contentSummary}`;
    }
    return content;
  }

  /**
   * Build actions text for prompts from ActionItem array
   */
  protected buildActionsText(
    actions: Array<{
      description: string;
      priority?: string;
      estimatedDuration?: string;
    }>,
    label = "Suggested Actions",
  ): string {
    if (!actions || actions.length === 0) {
      return "";
    }

    let actionsText = `\n\n[${label}]\n`;
    actionsText += actions
      .map(
        (action, idx) =>
          `${idx + 1}. ${action.description}${action.priority ? ` (Priority: ${action.priority})` : ""}${action.estimatedDuration ? ` [Duration: ${action.estimatedDuration}]` : ""}`,
      )
      .join("\n");
    return actionsText;
  }
}
