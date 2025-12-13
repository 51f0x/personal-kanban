import { apiDelete, apiGet, apiPatch, apiPost } from './api';
import type { Hint } from './types';

export async function fetchHints(taskId: string): Promise<Hint[]> {
    return apiGet<Hint[]>(`/tasks/${taskId}/hints`);
}

export async function applyHint(
    hintId: string,
    dismiss = false,
): Promise<{ message: string; hint: Hint }> {
    return apiPost<{ message: string; hint: Hint }>(`/hints/${hintId}/apply`, { dismiss });
}

export async function dismissHint(hintId: string): Promise<Hint> {
    return apiPatch<Hint>(`/hints/${hintId}/dismiss`);
}

export async function deleteHint(hintId: string): Promise<void> {
    return apiDelete<void>(`/hints/${hintId}`);
}
