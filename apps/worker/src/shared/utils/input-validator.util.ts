import * as Joi from 'joi';

/**
 * Input validation constants
 */
export const INPUT_LIMITS = {
    TITLE_MAX_LENGTH: 500,
    DESCRIPTION_MAX_LENGTH: 10000,
    CONTENT_MAX_LENGTH: 100000, // 100KB for content processing
    URL_MAX_LENGTH: 2048,
    TAG_MAX_LENGTH: 50,
    TAG_MAX_COUNT: 20,
} as const;

/**
 * Validate task title
 */
export function validateTitle(title: string): { valid: boolean; error?: string } {
    if (!title || typeof title !== 'string') {
        return { valid: false, error: 'Title is required and must be a string' };
    }

    if (title.trim().length === 0) {
        return { valid: false, error: 'Title cannot be empty' };
    }

    if (title.length > INPUT_LIMITS.TITLE_MAX_LENGTH) {
        return {
            valid: false,
            error: `Title exceeds maximum length of ${INPUT_LIMITS.TITLE_MAX_LENGTH} characters`,
        };
    }

    return { valid: true };
}

/**
 * Validate task description
 */
export function validateDescription(description?: string): { valid: boolean; error?: string } {
    if (description === undefined || description === null) {
        return { valid: true }; // Optional field
    }

    if (typeof description !== 'string') {
        return { valid: false, error: 'Description must be a string' };
    }

    if (description.length > INPUT_LIMITS.DESCRIPTION_MAX_LENGTH) {
        return {
            valid: false,
            error: `Description exceeds maximum length of ${INPUT_LIMITS.DESCRIPTION_MAX_LENGTH} characters`,
        };
    }

    return { valid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL is required and must be a string' };
    }

    if (url.length > INPUT_LIMITS.URL_MAX_LENGTH) {
        return {
            valid: false,
            error: `URL exceeds maximum length of ${INPUT_LIMITS.URL_MAX_LENGTH} characters`,
        };
    }

    try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return { valid: false, error: 'URL must use http or https protocol' };
        }
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Validate content size for processing
 */
export function validateContentSize(content: string): { valid: boolean; error?: string } {
    if (!content || typeof content !== 'string') {
        return { valid: false, error: 'Content is required and must be a string' };
    }

    if (content.length > INPUT_LIMITS.CONTENT_MAX_LENGTH) {
        return {
            valid: false,
            error: `Content exceeds maximum length of ${INPUT_LIMITS.CONTENT_MAX_LENGTH} characters`,
        };
    }

    return { valid: true };
}

/**
 * Validate tags array
 */
export function validateTags(tags: string[]): { valid: boolean; error?: string } {
    if (!Array.isArray(tags)) {
        return { valid: false, error: 'Tags must be an array' };
    }

    if (tags.length > INPUT_LIMITS.TAG_MAX_COUNT) {
        return {
            valid: false,
            error: `Maximum ${INPUT_LIMITS.TAG_MAX_COUNT} tags allowed`,
        };
    }

    for (const tag of tags) {
        if (typeof tag !== 'string') {
            return { valid: false, error: 'All tags must be strings' };
        }

        if (tag.length === 0) {
            return { valid: false, error: 'Tags cannot be empty' };
        }

        if (tag.length > INPUT_LIMITS.TAG_MAX_LENGTH) {
            return {
                valid: false,
                error: `Tag "${tag.substring(0, 20)}..." exceeds maximum length of ${INPUT_LIMITS.TAG_MAX_LENGTH} characters`,
            };
        }
    }

    return { valid: true };
}

/**
 * Joi schema for task title validation
 */
export const titleSchema = Joi.string().trim().min(1).max(INPUT_LIMITS.TITLE_MAX_LENGTH).required();

/**
 * Joi schema for task description validation
 */
export const descriptionSchema = Joi.string()
    .trim()
    .max(INPUT_LIMITS.DESCRIPTION_MAX_LENGTH)
    .allow('', null)
    .optional();

/**
 * Joi schema for URL validation
 */
export const urlSchema = Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(INPUT_LIMITS.URL_MAX_LENGTH)
    .required();
