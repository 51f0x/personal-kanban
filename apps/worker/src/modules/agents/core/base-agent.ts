import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type RetryOptions,
  retryWithBackoff,
  withTimeout,
} from "@personal-kanban/shared";
import { Ollama } from "ollama";
import { INPUT_LIMITS } from "../../../shared/utils/input-validator.util";

/**
 * Base class for all agents
 * Provides common functionality: model management, LLM calls with timeout/retry
 */
@Injectable()
export abstract class BaseAgent {
  protected readonly logger: Logger;
  protected readonly ollama: Ollama;
  protected readonly model: string;
  protected readonly endpoint: string;
  protected readonly llmTimeoutMs: number;
  protected readonly maxRetries: number;

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
    this.ollama = new Ollama({ host: this.endpoint });
  }

  /**
   * Ensure the model is available, pull it if necessary
   */
  protected async ensureModel(): Promise<void> {
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
          `LLM call timed out after ${this.llmTimeoutMs}ms`,
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
          warn: (msg, ...args) => this.logger.warn(msg, ...args),
          error: (msg, ...args) => this.logger.error(msg, ...args),
        },
      } as RetryOptions,
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
}
