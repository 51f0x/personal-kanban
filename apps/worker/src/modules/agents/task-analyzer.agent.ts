import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskContext } from '@prisma/client';
import { BaseAgent } from './base-agent';
import { parseAndValidateJson } from '../../shared/utils';
import { taskAnalysisResponseSchema } from '../../shared/schemas/agent-schemas';
import { validateTitle, validateDescription } from '../../shared/utils/input-validator.util';

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
  priority?: 'low' | 'medium' | 'high';
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
  readonly agentId = 'task-analyzer-agent';

  constructor(config: ConfigService) {
    super(config, TaskAnalyzerAgent.name);
  }

  /**
   * Analyze a task with optional content summary
   * Works only on provided data - no invention
   */
  async analyzeTask(
    title: string,
    description?: string,
    contentSummary?: string,
  ): Promise<TaskAnalysisResult> {
    // Validate inputs
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      this.logError('Title validation failed', new Error(titleValidation.error || 'Invalid title'));
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: titleValidation.error || 'Invalid title',
      };
    }

    if (description) {
      const descValidation = validateDescription(description);
      if (!descValidation.valid) {
        this.logError(
          'Description validation failed',
          new Error(descValidation.error || 'Invalid description'),
        );
        return {
          agentId: this.agentId,
          success: false,
          confidence: 0,
          error: descValidation.error || 'Invalid description',
        };
      }
    }

    try {
      await this.ensureModel();

      const prompt = this.buildAnalysisPrompt(title, description, contentSummary);

      this.logOperation('Analyzing task', {
        title: title.substring(0, 50),
        hasDescription: !!description,
        hasContentSummary: !!contentSummary,
      });

      const response = await this.callLlm(
        () =>
          this.ollama.generate({
            model: this.model,
            prompt,
            stream: false,
            format: 'json',
            options: {
              temperature: 0.5, // Moderate temperature for balanced analysis
            },
          }),
        'task analysis',
      );

      const analysisText = response.response || '';

      // Parse and validate JSON (LLM response doesn't include agentId/success)
      const parseResult = parseAndValidateJson(
        analysisText,
        taskAnalysisResponseSchema,
        this.logger,
        'task analysis',
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
          },
        };
      } else {
        this.logError('Failed to parse analysis result', new Error(parseResult.error), {
          rawResponse: analysisText.substring(0, 200),
        });
        return {
          agentId: this.agentId,
          success: false,
          confidence: 0,
          error: parseResult.error || 'Failed to parse analysis result',
          metadata: {
            rawResponse: analysisText.substring(0, 200),
          },
        };
      }
    } catch (error) {
      this.logError('Error analyzing task', error, { title: title.substring(0, 50) });
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
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
  ): string {
    let taskText = title;
    if (description) {
      taskText += `\n\n${description}`;
    }
    if (contentSummary) {
      taskText += `\n\n[Content Summary from URL]\n${contentSummary}`;
    }

    return `Analyze the following task and extract relevant metadata to help the human perform the task more effectively. Return a JSON object with the following structure:

{
  "suggestedTitle": string,
  "suggestedDescription": string | null,
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
- Your goal is to help the human perform this task more effectively by providing clear, actionable metadata
- Set "suggestedTitle" to a clear, concise task title that makes the task easy to understand
- Set "suggestedDescription" to a helpful description that guides the human on what needs to be done (use content summary if available to provide relevant context)
- Set "context" based on where the task should be done (EMAIL for email-related, MEETING for meetings, READ for reading tasks, etc.)
- Set "waitingFor" if the task is blocked by someone or something
- Set "dueAt" if there's a clear deadline mentioned (ISO format)
- Set "needsBreakdown" to true if the task is complex and should be broken down
- Suggest relevant tags based on the task content (3-5 tags max) that help categorize and find the task
- Set priority based on urgency and importance to help prioritize work
- Estimate duration in a human-readable format (e.g., "30 minutes", "2 hours") to help with planning
- Set confidence between 0 and 1 based on how certain you are about the analysis
- Only use information from the provided task and content - do not invent information
- Process all content (including summaries) with the goal of making the task easier to understand and complete

Return only valid JSON, no markdown formatting.`;
  }
}

