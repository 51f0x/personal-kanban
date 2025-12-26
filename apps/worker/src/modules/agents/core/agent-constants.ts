/**
 * Agent configuration constants
 * Centralized constants for better maintainability and configuration
 */

/**
 * LLM temperature settings for different agent operations
 */
export const LLM_TEMPERATURE = {
  /** Very low temperature for factual operations (formatting, cleanup) */
  FACTUAL: 0.2,
  /** Low temperature for consistent, deterministic operations */
  CONSISTENT: 0.3,
  /** Moderate temperature for balanced analysis */
  BALANCED: 0.4,
  /** Medium temperature for balanced creativity */
  MEDIUM: 0.5,
  /** Higher temperature for creative tasks */
  CREATIVE: 0.7,
} as const;

/**
 * Confidence thresholds for different operations
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Low confidence for minimal content */
  LOW: 0.3,
  /** Medium confidence for partial results */
  MEDIUM: 0.5,
  /** Medium-high confidence for good results */
  MEDIUM_HIGH: 0.6,
  /** High confidence for reliable results */
  HIGH: 0.7,
  /** Very high confidence for excellent results */
  VERY_HIGH: 0.8,
  /** Excellent confidence for near-perfect results */
  EXCELLENT: 0.85,
  /** Maximum confidence */
  MAXIMUM: 0.95,
} as const;

/**
 * Content limits and sizes
 */
export const CONTENT_LIMITS = {
  /** Maximum web content to include in prompts (chars) */
  WEB_CONTENT_MAX: 5000,
  /** Large content truncation limit (chars) */
  LARGE_CONTENT_TRUNCATE: 10000,
  /** Minimum content length for meaningful extraction (chars) */
  MIN_EXTRACTION_LENGTH: 200,
} as const;

/**
 * Network timeouts (milliseconds)
 */
export const NETWORK_TIMEOUTS = {
  /** Quick HEAD request timeout */
  HEAD_REQUEST: 10000,
  /** Standard fetch timeout */
  STANDARD_FETCH: 30000,
  /** Browser navigation timeout */
  BROWSER_NAVIGATION: 60000,
  /** Delay for async content loading (ms) */
  ASYNC_CONTENT_DELAY: 2000,
} as const;

/**
 * Default values for agent operations
 */
export const AGENT_DEFAULTS = {
  /** Default summary length (words) */
  SUMMARY_LENGTH: 1000,
  /** Minimum summary length (words) */
  MIN_SUMMARY_LENGTH: 100,
  /** Minimum content length for summarization (chars) */
  MIN_CONTENT_FOR_SUMMARIZATION: 500,
} as const;
