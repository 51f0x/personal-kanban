/**
 * Retry utility with exponential backoff
 * Framework-agnostic version (no NestJS dependencies)
 */

export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: (error: Error) => boolean;
    logger?: {
        warn?: (message: string, ...args: unknown[]) => void;
        error?: (message: string, ...args: unknown[]) => void;
    };
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'logger'>> = {
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
): Promise<T> {
    const opts = {
        ...DEFAULT_OPTIONS,
        retryableErrors: options.retryableErrors || isRetryableError,
        logger: options.logger,
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
                if (opts.logger?.warn) {
                    opts.logger.warn(
                        `Non-retryable error on attempt ${attempt}: ${lastError.message}`,
                    );
                }
                throw lastError;
            }

            if (attempt === opts.maxAttempts) {
                if (opts.logger?.error) {
                    opts.logger.error(
                        `Failed after ${opts.maxAttempts} attempts: ${lastError.message}`,
                        lastError.stack,
                    );
                }
                throw lastError;
            }

            if (opts.logger?.warn) {
                opts.logger.warn(
                    `Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`,
                );
            }

            await new Promise((resolve) => setTimeout(resolve, delay));
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
        }
    }

    throw lastError || new Error('Retry failed');
}
