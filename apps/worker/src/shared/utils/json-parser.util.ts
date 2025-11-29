import { Logger } from '@nestjs/common';
import * as Joi from 'joi';

/**
 * Parse JSON string and validate against Joi schema
 * Handles markdown-wrapped JSON and provides fallback extraction
 */
export function parseAndValidateJson<T>(
  jsonText: string,
  schema: Joi.Schema<T>,
  logger: Logger,
  context?: string,
): { success: true; data: T } | { success: false; error: string } {
  if (!jsonText || typeof jsonText !== 'string') {
    return { success: false, error: 'Invalid input: expected string' };
  }

  let parsed: unknown;

  // Try direct JSON parse first
  try {
    parsed = JSON.parse(jsonText);
  } catch (parseError) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch =
      jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (nestedError) {
        logger.warn(
          `Failed to parse JSON${context ? ` in ${context}` : ''}`,
          { rawText: jsonText.substring(0, 200) },
        );
        return { success: false, error: 'Failed to parse JSON from response' };
      }
    } else {
      logger.warn(
        `No valid JSON found${context ? ` in ${context}` : ''}`,
        { rawText: jsonText.substring(0, 200) },
      );
      return { success: false, error: 'No valid JSON found in response' };
    }
  }

  // Validate against schema
  const { error, value } = schema.validate(parsed, {
    stripUnknown: true,
    abortEarly: false,
  });

  if (error) {
    logger.warn(
      `JSON validation failed${context ? ` in ${context}` : ''}`,
      { errors: error.details.map((d) => d.message) },
    );
    return { success: false, error: `Validation failed: ${error.message}` };
  }

  return { success: true, data: value };
}

/**
 * Extract JSON from text with fallback patterns
 */
export function extractJsonFromText(text: string): string | null {
  if (!text) return null;

  // Try direct parse
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Try markdown code block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1];
    }

    // Try to find JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return objectMatch[0];
    }
  }

  return null;
}

