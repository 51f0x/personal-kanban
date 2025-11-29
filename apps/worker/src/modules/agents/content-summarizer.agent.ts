import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';

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
export class ContentSummarizerAgent {
  private readonly logger = new Logger(ContentSummarizerAgent.name);
  private readonly ollama: Ollama;
  private readonly model: string;
  readonly agentId = 'content-summarizer-agent';

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('LLM_ENDPOINT', 'http://localhost:11434');
    this.model = this.config.get<string>('LLM_MODEL', 'granite4:1b');
    this.ollama = new Ollama({ host: endpoint });
  }

  /**
   * Summarize content using LLM
   * Works only on provided content - does not invent anything
   */
  async summarize(content: string, maxLength: number = 500): Promise<SummarizationResult> {
    if (!content || content.trim().length === 0) {
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: 'No content to summarize',
        originalLength: 0,
        summary: '',
      };
    }

    try {
      // Ensure the model is available
      await this.ensureModel();

      const originalLength = content.length;
      
      // Truncate content if too long (keep first part which usually has most important info)
      const contentToSummarize = content.length > 50000 
        ? content.substring(0, 50000) + '\n\n[Content truncated for summarization]'
        : content;

      const prompt = this.buildSummarizationPrompt(contentToSummarize, maxLength);

      this.logger.log(`Summarizing content (${originalLength} chars, target: ${maxLength} words)`);

      const response = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.3, // Lower temperature for factual summarization
        },
      });

      const summaryText = response.response || '';

      // Parse the JSON response
      try {
        const parsed = JSON.parse(summaryText) as {
          summary: string;
          keyPoints?: string[];
        };

        const summary = parsed.summary || '';
        const keyPoints = parsed.keyPoints || [];
        const wordCount = summary.split(/\s+/).length;

        this.logger.log(`Summarized to ${wordCount} words with ${keyPoints.length} key points`);

        return {
          agentId: this.agentId,
          success: true,
          confidence: summary.length > 0 ? 0.85 : 0.5,
          originalLength,
          summary,
          keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
          wordCount,
          metadata: {
            compressionRatio: originalLength > 0 ? (summary.length / originalLength) : 0,
            model: this.model,
          },
        };
      } catch (parseError) {
        this.logger.warn('Failed to parse LLM response as JSON, trying to extract text');
        
        // Try to extract summary from markdown or plain text
        const jsonMatch = summaryText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         summaryText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]) as {
            summary: string;
            keyPoints?: string[];
          };
          return {
            agentId: this.agentId,
            success: true,
            confidence: 0.7,
            originalLength,
            summary: parsed.summary || summaryText,
            keyPoints: parsed.keyPoints,
            wordCount: (parsed.summary || summaryText).split(/\s+/).length,
            metadata: {
              model: this.model,
              parseWarning: 'Required JSON extraction',
            },
          };
        }

        // Fallback: use the raw response as summary
        return {
          agentId: this.agentId,
          success: true,
          confidence: 0.6,
          originalLength,
          summary: summaryText.trim(),
          wordCount: summaryText.trim().split(/\s+/).length,
          metadata: {
            model: this.model,
            fallback: true,
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error summarizing content: ${errorMessage}`);
      
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: errorMessage,
        originalLength: content.length,
        summary: '',
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
   * Build the summarization prompt
   */
  private buildSummarizationPrompt(content: string, maxLength: number): string {
    return `You are a content summarizer. Summarize the following web content into a concise summary that will help someone understand and work with the task.

Rules:
- Only use information from the provided content - do not invent or add information
- Create a summary of approximately ${maxLength} words
- Extract 3-5 key points if the content is substantial
- Focus on actionable information and important facts
- Preserve important details like dates, names, numbers, and specific requirements

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

