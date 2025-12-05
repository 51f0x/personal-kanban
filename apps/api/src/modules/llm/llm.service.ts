import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskContext } from '@prisma/client';
import { Ollama } from 'ollama';
import * as Joi from 'joi';
import { parseAndValidateJson } from '../../shared/utils/json-parser.util';
import { withTimeout } from '../../shared/utils/timeout.util';
import { retryWithBackoff } from '../../shared/utils/retry.util';

export interface TaskAnalysisResult {
    context?: TaskContext;
    waitingFor?: string;
    dueAt?: string;
    needsBreakdown?: boolean;
    suggestedTags?: string[];
    priority?: 'low' | 'medium' | 'high';
    estimatedDuration?: string;
    confidence: number;
}

// Schema for task analysis result
const taskAnalysisResultSchema = Joi.object({
    context: Joi.string()
        .valid('EMAIL', 'MEETING', 'PHONE', 'READ', 'WATCH', 'DESK', 'OTHER')
        .allow(null)
        .optional(),
    waitingFor: Joi.string().allow(null).optional(),
    dueAt: Joi.string().isoDate().allow(null).optional(),
    needsBreakdown: Joi.boolean().optional(),
    suggestedTags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    priority: Joi.string().valid('low', 'medium', 'high').allow(null).optional(),
    estimatedDuration: Joi.string().allow(null).optional(),
    confidence: Joi.number().min(0).max(1).default(0.7),
});

@Injectable()
export class LlmService {
    private readonly logger = new Logger(LlmService.name);
    private readonly ollama: Ollama;
    private readonly model: string;
    private readonly llmTimeoutMs: number;
    private readonly maxRetries: number;

    constructor(private readonly config: ConfigService) {
        const endpoint = this.config.get<string>('LLM_ENDPOINT', 'http://localhost:11434');
        this.model = this.config.get<string>('LLM_MODEL', 'granite4:1b');
        this.llmTimeoutMs = this.config.get<number>('LLM_TIMEOUT_MS', 120000);
        this.maxRetries = this.config.get<number>('LLM_MAX_RETRIES', 2);
        this.ollama = new Ollama({ host: endpoint });
    }

    /**
     * Analyze a task and extract metadata using the LLM
     */
    async analyzeTask(title: string, description?: string): Promise<TaskAnalysisResult | null> {
        try {
            await this.ensureModel();

            const prompt = this.buildAnalysisPrompt(title, description);

            this.logger.log('Analyzing task with LLM', {
                title: title.substring(0, 50),
                hasDescription: !!description,
                model: this.model,
            });

            const response = await retryWithBackoff(
                () =>
                    withTimeout(
                        this.ollama.generate({
                            model: this.model,
                            prompt,
                            stream: false,
                            format: 'json',
                        }),
                        this.llmTimeoutMs,
                        `LLM call timed out after ${this.llmTimeoutMs}ms`,
                    ),
                {
                    maxAttempts: this.maxRetries + 1,
                    initialDelayMs: 1000,
                    maxDelayMs: 5000,
                },
                this.logger,
            );

            const analysisText = response.response || '';

            // Parse and validate JSON
            const parseResult = parseAndValidateJson(
                analysisText,
                taskAnalysisResultSchema,
                this.logger,
                'task analysis',
            );

            if (parseResult.success) {
                return parseResult.data;
            } else {
                this.logger.warn('Failed to parse LLM response', { error: parseResult.error });
                return null;
            }
        } catch (error) {
            this.logger.error(
                'Error calling LLM service',
                error instanceof Error ? error.stack : undefined,
                {
                    error: error instanceof Error ? error.message : String(error),
                    title: title.substring(0, 50),
                },
            );
            return null;
        }
    }

    /**
     * Ensure the model is available, pull it if necessary
     */
    private async ensureModel(): Promise<void> {
        try {
            const listResponse = await withTimeout(
                this.ollama.list(),
                this.llmTimeoutMs,
                'Model list check timed out',
            );
            const models = listResponse.models || [];
            const modelExists = models.some((m) => m.name === this.model);

            if (!modelExists) {
                this.logger.log(`Pulling model ${this.model}...`);
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
                    this.logger.warn(`Failed to pull model ${this.model}: ${errorMessage}`);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Could not ensure model availability: ${errorMessage}`);
            // Continue anyway - the model might already be available
        }
    }

    /**
     * Build the prompt for task analysis
     */
    private buildAnalysisPrompt(title: string, description?: string): string {
        const taskText = description ? `${title}\n\n${description}` : title;

        return `Analyze the following task and extract relevant metadata. Return a JSON object with the following structure:

{
  "title": string,
  "context": "EMAIL" | "MEETING" | "PHONE" | "READ" | "WATCH" | "DESK" | "OTHER" | null,
  "waitingFor": string | null,
  "dueAt": ISO date string | null,
  "needsBreakdown": boolean,
  "suggestedTags": string[],
  "priority": "low" | "medium" | "high" | null,
  "estimatedDuration": string | null,
  "confidence": number (0-1)
}

Task:
${taskText}

Rules:
- Set "title" to the title of the task
- Set "context" based on where the task should be done (EMAIL for email-related, MEETING for meetings, etc.)
- Set "waitingFor" if the task is blocked by someone or something
- Set "dueAt" if there's a clear deadline mentioned
- Set "needsBreakdown" to true if the task is complex and should be broken down
- Suggest relevant tags based on the task content
- Set priority based on urgency and importance
- Estimate duration in a human-readable format (e.g., "30 minutes", "2 hours")
- Set confidence between 0 and 1 based on how certain you are about the analysis

Return only valid JSON, no markdown formatting.`;
    }
}
