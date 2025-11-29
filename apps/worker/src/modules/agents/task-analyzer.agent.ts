import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { TaskContext } from '@prisma/client';

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
export class TaskAnalyzerAgent {
  private readonly logger = new Logger(TaskAnalyzerAgent.name);
  private readonly ollama: Ollama;
  private readonly model: string;
  readonly agentId = 'task-analyzer-agent';

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('LLM_ENDPOINT', 'http://localhost:11434');
    this.model = this.config.get<string>('LLM_MODEL', 'granite4:1b');
    this.ollama = new Ollama({ host: endpoint });
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
    try {
      await this.ensureModel();

      const prompt = this.buildAnalysisPrompt(title, description, contentSummary);

      this.logger.log(`Analyzing task: ${title.substring(0, 50)}...`);

      const response = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.5, // Moderate temperature for balanced analysis
        },
      });

      const analysisText = response.response || '';

      try {
        const analysis = JSON.parse(analysisText) as Partial<TaskAnalysisResult> & { confidence?: number };

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
      } catch (parseError) {
        this.logger.warn('Failed to parse LLM response as JSON');
        
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         analysisText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[1] || jsonMatch[0]) as Partial<TaskAnalysisResult> & { confidence?: number };
          return {
            agentId: this.agentId,
            success: true,
            confidence: analysis.confidence || 0.65,
            ...analysis,
            metadata: {
              ...analysis.metadata,
              model: this.model,
              parseWarning: 'Required JSON extraction',
            },
          };
        }

        return {
          agentId: this.agentId,
          success: false,
          confidence: 0,
          error: 'Failed to parse analysis result',
          metadata: {
            rawResponse: analysisText.substring(0, 200),
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error analyzing task: ${errorMessage}`);
      
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Ensure the model is available
   */
  private async ensureModel(): Promise<void> {
    try {
      const listResponse = await this.ollama.list();
      const models = listResponse.models || [];
      const modelExists = models.some((m: { name: string }) => m.name === this.model);

      if (!modelExists) {
        this.logger.log(`Pulling model ${this.model}...`);
        try {
          await this.ollama.pull({
            model: this.model,
            stream: false,
          });
          this.logger.log(`Model ${this.model} pulled successfully`);
        } catch (pullError) {
          this.logger.warn(`Failed to pull model ${this.model}:`, pullError);
        }
      }
    } catch (error) {
      this.logger.warn('Could not ensure model availability', error);
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

    return `Analyze the following task and extract relevant metadata. Return a JSON object with the following structure:

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
- Set "suggestedTitle" to a clear, concise task title
- Set "suggestedDescription" to a helpful description (use content summary if available)
- Set "context" based on where the task should be done (EMAIL for email-related, MEETING for meetings, READ for reading tasks, etc.)
- Set "waitingFor" if the task is blocked by someone or something
- Set "dueAt" if there's a clear deadline mentioned (ISO format)
- Set "needsBreakdown" to true if the task is complex and should be broken down
- Suggest relevant tags based on the task content (3-5 tags max)
- Set priority based on urgency and importance
- Estimate duration in a human-readable format (e.g., "30 minutes", "2 hours")
- Set confidence between 0 and 1 based on how certain you are about the analysis
- Only use information from the provided task and content - do not invent information

Return only valid JSON, no markdown formatting.`;
  }
}

