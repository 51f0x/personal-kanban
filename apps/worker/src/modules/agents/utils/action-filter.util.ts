import type { ActionItem } from "../agents/action-extractor.agent";

/**
 * Trivial action patterns that should be filtered out
 * These are actions that don't add meaningful value to task completion
 */
const TRIVIAL_PATTERNS = [
  // Browser/navigation actions
  /^open\s+(the\s+)?browser/i,
  /^navigate\s+to/i,
  /^go\s+to\s+(the\s+)?(url|website|link|page)/i,
  /^visit\s+(the\s+)?(url|website|link|page)/i,
  /^access\s+(the\s+)?(url|website|link|page)/i,
  /^click\s+on\s+(the\s+)?link/i,
  /^open\s+(the\s+)?link/i,
  /^open\s+(the\s+)?url/i,
  /^open\s+(the\s+)?website/i,
  /^open\s+(the\s+)?page/i,

  // Generic/obvious actions
  /^read\s+(the\s+)?(content|text|page|document|article)/i,
  /^view\s+(the\s+)?(content|text|page|document|article)/i,
  /^look\s+at/i,
  /^check\s+(the\s+)?(url|link|website|page)/i,

  // Too vague
  /^start/i,
  /^begin/i,
  /^prepare/i,
  /^get\s+ready/i,

  // Single word actions that are too generic
  /^(read|view|check|open|click|navigate|visit|access)$/i,
];

/**
 * Check if an action is trivial and should be filtered out
 */
export function isTrivialAction(action: ActionItem): boolean {
  const description = action.description.trim().toLowerCase();

  // Check against trivial patterns
  for (const pattern of TRIVIAL_PATTERNS) {
    if (pattern.test(description)) {
      return true;
    }
  }

  // Filter very short actions that are likely trivial
  if (description.length < 10) {
    return true;
  }

  // Filter actions that are just the task title repeated
  // (this would be caught by the LLM, but add as safety)

  return false;
}

/**
 * Filter out trivial actions from an array
 */
export function filterTrivialActions(actions: ActionItem[]): ActionItem[] {
  return actions.filter((action) => !isTrivialAction(action));
}

/**
 * @deprecated TODO: DELETE ASAP - Only used by SolutionProposerAgent which is being deleted.
 * Check if a solution step is trivial
 */
export function isTrivialSolutionStep(step: string): boolean {
  const stepLower = step.trim().toLowerCase();

  // Check against trivial patterns
  for (const pattern of TRIVIAL_PATTERNS) {
    if (pattern.test(stepLower)) {
      return true;
    }
  }

  // Filter very short steps
  if (stepLower.length < 15) {
    return true;
  }

  return false;
}

/**
 * @deprecated TODO: DELETE ASAP - Only used by SolutionProposerAgent which is being deleted.
 * Filter trivial steps from solution proposals
 */
export function filterTrivialSolutionSteps(steps: string[]): string[] {
  return steps.filter((step) => !isTrivialSolutionStep(step));
}
