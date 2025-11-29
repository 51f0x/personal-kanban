import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { TaskContext } from '@prisma/client';

export interface ContextExtractionResult {
  agentId: string;
  success: boolean;
  confidence?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  context?: TaskContext;
  tags?: string[];
  projectHints?: string[];
  estimatedDuration?: string;
}

/**
 * Context Extractor Agent
 * Specialized agent for extracting context, tags, and project hints from content
 * Works only on provided data
 */
@Injectable()
export class ContextExtractorAgent {
  private readonly logger = new Logger(ContextExtractorAgent.name);
  private readonly ollama: Ollama;
  private readonly model: string;
  readonly agentId = 'context-extractor-agent';

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('LLM_ENDPOINT', 'http://localhost:11434');
    this.model = this.config.get<string>('LLM_MODEL', 'granite4:1b');
    this.ollama = new Ollama({ host: endpoint });
  }

  /**
   * Extract context, tags, and project hints from content
   */
  async extractContext(
    title: string,
    description?: string,
    contentSummary?: string,
  ): Promise<ContextExtractionResult> {
    try {
      await this.ensureModel();

      const prompt = this.buildExtractionPrompt(title, description, contentSummary);

      this.logger.log(`Extracting context from: ${title.substring(0, 50)}...`);

      const response = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.4, // Lower temperature for more consistent extraction
        },
      });

      const extractionText = response.response || '';

      try {
        const extraction = JSON.parse(extractionText) as Partial<ContextExtractionResult> & { confidence?: number };

        return {
          agentId: this.agentId,
          success: true,
          confidence: extraction.confidence || 0.75,
          ...extraction,
          metadata: {
            ...(extraction.metadata || {}),
            model: this.model,
          },
        };
      } catch (parseError) {
        this.logger.warn('Failed to parse extraction result as JSON');
        
        const jsonMatch = extractionText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         extractionText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const extraction = JSON.parse(jsonMatch[1] || jsonMatch[0]) as Partial<ContextExtractionResult> & { confidence?: number };
          return {
            agentId: this.agentId,
            success: true,
            confidence: extraction.confidence || 0.65,
            ...extraction,
            metadata: {
              ...extraction.metadata,
              model: this.model,
            },
          };
        }

        return {
          agentId: this.agentId,
          success: false,
          confidence: 0,
          error: 'Failed to parse extraction result',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error extracting context: ${errorMessage}`);
      
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
   * Build the context extraction prompt
   */
  private buildExtractionPrompt(
    title: string,
    description?: string,
    contentSummary?: string,
  ): string {
    let content = title;
    if (description) {
      content += `\n\n${description}`;
    }
    if (contentSummary) {
      content += `\n\n[Content Summary]\n${contentSummary}`;
    }

    return `Extract context, tags, and project hints from the following task content. Return a JSON object:

{
  "context": "EMAIL" | "MEETING" | "PHONE" | "READ" | "WATCH" | "DESK" | "OTHER" | null,
  "tags": string[],
  "projectHints": string[],
  "estimatedDuration": string | null,
  "confidence": number (0-1)
}

Task Content:
${content}

Rules:
- Set "context" based on where/when the task should be done
- Extract 3-7 relevant tags (be specific, use lowercase, hyphenate multi-word tags)
- Suggest 0-3 project hints (if the task seems part of a larger project)
- Estimate duration if possible (e.g., "30 minutes", "1 hour")
- Set confidence based on how clear the context indicators are
- Only use information from the provided content - do not invent

Return only valid JSON, no markdown formatting.`;
  }
}

