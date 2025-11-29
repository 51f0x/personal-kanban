import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskContext } from '@prisma/client';
import { Ollama } from 'ollama';

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

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly ollama: Ollama;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('LLM_ENDPOINT', 'http://localhost:11434');
    this.model = this.config.get<string>('LLM_MODEL', 'granite4:1b');
    this.ollama = new Ollama({ host: endpoint });
  }

  /**
   * Analyze a task and extract metadata using the LLM
   */
  async analyzeTask(title: string, description?: string): Promise<TaskAnalysisResult | null> {
    try {
      // Ensure the model is available
      await this.ensureModel();

      const prompt = this.buildAnalysisPrompt(title, description);

      const response = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: false,
        format: 'json',
      });

      const analysisText = response.response || '';

      // Parse the JSON response
      try {
        const analysis = JSON.parse(analysisText) as TaskAnalysisResult;
        return {
          ...analysis,
          confidence: analysis.confidence || 0.7,
        };
      } catch (parseError) {
        this.logger.warn('Failed to parse LLM response as JSON', analysisText);
        // Try to extract JSON from the response if it's wrapped in markdown
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[1] || jsonMatch[0]) as TaskAnalysisResult;
          return {
            ...analysis,
            confidence: analysis.confidence || 0.7,
          };
        }
        return null;
      }
    } catch (error) {
      this.logger.error('Error calling LLM service', error);
      return null;
    }
  }

  /**
   * Ensure the model is available, pull it if necessary
   */
  private async ensureModel(): Promise<void> {
    try {
      const listResponse = await this.ollama.list();
      const models = listResponse.models || [];
      const modelExists = models.some((m) => m.name === this.model);

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

