import type { Hint, Task, TaskContext } from '../services/types';

/**
 * Helper to resolve display values from task properties first,
 * falling back to hints only if task property is not set.
 */
export function getTaskDisplayValue(task: Task): {
    title: string;
    description: string | null;
    context: TaskContext | null;
} {
    const hints = task.hints || [];

    // Find hints by type (prioritize unapplied, then by confidence)
    const findHint = (hintType: string): Hint | undefined => {
        return hints
            .filter((h) => h.hintType === hintType && !h.applied)
            .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    };

    // Use task property if set (not empty), otherwise fall back to hint
    const titleHint = findHint('title');
    const title = (task.title && task.title.trim()) || titleHint?.content || '';

    const descriptionHint = findHint('description');
    const description =
        (task.description && task.description.trim()) || descriptionHint?.content || null;

    const contextHint = findHint('context');
    const context = task.context || (contextHint?.content as TaskContext) || null;

    return {
        title,
        description,
        context,
    };
}
