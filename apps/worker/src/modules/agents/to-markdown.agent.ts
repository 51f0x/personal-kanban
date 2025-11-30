import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent } from './base-agent';
import { validateContentSize } from '../../shared/utils/input-validator.util';
import type { AgentResult } from './types';

export interface MarkdownFormatResult extends AgentResult {
  formattedDescription: string;
  originalLength: number;
  formattedLength: number;
}

/**
 * To-Markdown Agent
 * Formats task descriptions to proper markdown format
 * Runs as the last action after all other agents have processed
 */
@Injectable()
export class ToMarkdownAgent extends BaseAgent {
  readonly agentId = 'to-markdown-agent';

  constructor(config: ConfigService) {
    super(config, ToMarkdownAgent.name);
  }

  /**
   * Format task description to markdown
   * Converts plain text or poorly formatted text to well-structured markdown
   */
  async formatToMarkdown(
    title: string,
    description?: string,
  ): Promise<MarkdownFormatResult> {
    // If no description, nothing to format
    if (!description || description.trim().length === 0) {
      return {
        agentId: this.agentId,
        success: true,
        confidence: 1.0,
        formattedDescription: '',
        originalLength: 0,
        formattedLength: 0,
      };
    }

    try {
      await this.ensureModel();

      // Validate content size
      const contentValidation = validateContentSize(description);
      if (!contentValidation.valid) {
        return {
          agentId: this.agentId,
          success: false,
          confidence: 0,
          error: contentValidation.error || 'Description too long to format',
          formattedDescription: description,
          originalLength: description.length,
          formattedLength: description.length,
        };
      }

      const prompt = this.buildFormatPrompt(title, description);

      this.logger.log(`Formatting description to markdown for task: ${title.substring(0, 50)}...`);

      const response = await this.callLlm(
        () =>
          this.ollama.generate({
            model: this.model,
            prompt,
            stream: false,
            format: 'json',
            options: {
              temperature: 0.2, // Low temperature for consistent formatting
            },
          }),
        'format-description-to-markdown',
      );

      const formatText = response.response || '';

      try {
        const formatResult = JSON.parse(formatText) as {
          formattedDescription: string;
          confidence?: number;
        };

        const formattedDescription = formatResult.formattedDescription || description;

        return {
          agentId: this.agentId,
          success: true,
          confidence: formatResult.confidence || 0.9,
          formattedDescription,
          originalLength: description.length,
          formattedLength: formattedDescription.length,
          metadata: {
            model: this.model,
            originalLength: description.length,
            formattedLength: formattedDescription.length,
          },
        };
      } catch (parseError) {
        this.logger.warn('Failed to parse markdown format response, using original description', parseError);
        // Return original description if parsing fails
        return {
          agentId: this.agentId,
          success: false,
          confidence: 0.5,
          error: 'Failed to parse format response',
          formattedDescription: description,
          originalLength: description.length,
          formattedLength: description.length,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error formatting description to markdown: ${errorMessage}`);
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: errorMessage,
        formattedDescription: description,
        originalLength: description.length,
        formattedLength: description.length,
      };
    }
  }

  /**
   * Build the markdown formatting prompt
   */
  private buildFormatPrompt(title: string, description: string): string {
    return `Format the following task description into well-structured markdown. Return a JSON object:

{
  "formattedDescription": string (markdown formatted description),
  "confidence": number (0-1, how confident you are about the formatting)
}

Task Title:
${title}

Current Description:
${description}

Rules:
- Format the description into proper markdown syntax
- Use headers (##, ###) for major sections
- Use lists (-, *) for items
- Use **bold** for emphasis
- Use code blocks (\`\`\`) for code or commands
- Use links [text](url) for URLs
- Preserve all original information - do not add or remove content
- Improve structure and readability while keeping all content
- If description is already well-formatted markdown, return it as-is or improve it slightly
- Do not invent content - only format what's provided

Return only valid JSON, no markdown formatting.`;
  }
}

