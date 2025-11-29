import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';

export interface ActionItem {
  description: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedDuration?: string;
}

export interface ActionExtractionResult {
  agentId: string;
  success: boolean;
  confidence?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  actions?: ActionItem[];
  totalActions?: number;
}

/**
 * Action Extractor Agent
 * Extracts actionable items from content summaries
 * Helps break down complex tasks into smaller actions
 * Works only on provided content - no invention
 */
@Injectable()
export class ActionExtractorAgent {
  private readonly logger = new Logger(ActionExtractorAgent.name);
  private readonly ollama: Ollama;
  private readonly model: string;
  readonly agentId = 'action-extractor-agent';

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('LLM_ENDPOINT', 'http://localhost:11434');
    this.model = this.config.get<string>('LLM_MODEL', 'granite4:1b');
    this.ollama = new Ollama({ host: endpoint });
  }

  /**
   * Extract actionable items from content
   */
  async extractActions(
    title: string,
    description?: string,
    contentSummary?: string,
  ): Promise<ActionExtractionResult> {
    if (!contentSummary && !description) {
      // If no substantial content, try to extract from title alone
      return {
        agentId: this.agentId,
        success: true,
        confidence: 0.3,
        actions: [{
          description: title,
          priority: 'medium',
        }],
        totalActions: 1,
        metadata: {
          extractedFrom: 'title-only',
        },
      };
    }

    try {
      await this.ensureModel();

      const prompt = this.buildExtractionPrompt(title, description, contentSummary);

      this.logger.log(`Extracting actions from: ${title.substring(0, 50)}...`);

      const response = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.5,
        },
      });

      const extractionText = response.response || '';

      try {
        const extraction = JSON.parse(extractionText) as {
          actions?: ActionItem[];
          totalActions?: number;
        };

        const actions = extraction.actions || [];
        const totalActions = extraction.totalActions || actions.length;

        this.logger.log(`Extracted ${totalActions} actions`);

        return {
          agentId: this.agentId,
          success: true,
          confidence: actions.length > 0 ? 0.8 : 0.5,
          actions: actions.length > 0 ? actions : undefined,
          totalActions,
          metadata: {
            model: this.model,
          },
        };
      } catch (parseError) {
        this.logger.warn('Failed to parse action extraction result as JSON');
        
        const jsonMatch = extractionText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         extractionText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const extraction = JSON.parse(jsonMatch[1] || jsonMatch[0]) as {
            actions?: ActionItem[];
            totalActions?: number;
          };
          return {
            agentId: this.agentId,
            success: true,
            confidence: 0.65,
            actions: extraction.actions,
            totalActions: extraction.totalActions || extraction.actions?.length,
            metadata: {
              model: this.model,
              parseWarning: true,
            },
          };
        }

        return {
          agentId: this.agentId,
          success: false,
          confidence: 0,
          error: 'Failed to parse action extraction result',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error extracting actions: ${errorMessage}`);
      
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
   * Build the action extraction prompt
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

    return `Extract actionable items from the following task. Break down the task into specific, concrete actions that need to be completed. Return a JSON object:

{
  "actions": [
    {
      "description": "specific action item",
      "priority": "low" | "medium" | "high",
      "estimatedDuration": "30 minutes" | "1 hour" | etc.
    }
  ],
  "totalActions": number
}

Task:
${content}

Rules:
- Extract 1-10 specific, actionable items
- Each action should be concrete and completable
- Assign priority based on importance
- Estimate duration for each action if possible
- If the task is simple, return 1-2 actions
- If complex, break it down into 3-10 steps
- Only extract actions from the provided content - do not invent actions

Return only valid JSON, no markdown formatting.`;
  }
}

