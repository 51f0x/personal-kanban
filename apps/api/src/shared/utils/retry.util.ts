import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    'timeout',
    'network',
    'connection',
    'econnrefused',
    'etimedout',
    'eai_again',
    'temporary',
    'rate limit',
  ];

  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some((msg) => errorMessage.includes(msg));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  logger?: Logger,
): Promise<T> {
  const opts = {
    ...DEFAULT_OPTIONS,
    retryableErrors: options.retryableErrors || isRetryableError,
    ...options,
  };

  let lastError: Error | null = null;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!opts.retryableErrors(lastError)) {
        if (logger) {
          logger.warn(`Non-retryable error on attempt ${attempt}: ${lastError.message}`);
        }
        throw lastError;
      }

      if (attempt === opts.maxAttempts) {
        if (logger) {
          logger.error(
            `Failed after ${opts.maxAttempts} attempts: ${lastError.message}`,
            lastError.stack,
          );
        }
        throw lastError;
      }

      if (logger) {
        logger.warn(
          `Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError || new Error('Retry failed');
}

