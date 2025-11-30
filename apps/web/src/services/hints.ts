import { Hint } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export async function fetchHints(taskId: string): Promise<Hint[]> {
  const response = await fetch(`${API_URL}/tasks/${taskId}/hints`);
  if (!response.ok) {
    throw new Error(`Failed to fetch hints (${response.status})`);
  }
  return response.json();
}

export async function applyHint(hintId: string, dismiss: boolean = false): Promise<{ message: string; hint: Hint }> {
  const response = await fetch(`${API_URL}/hints/${hintId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dismiss }),
  });
  if (!response.ok) {
    throw new Error(`Failed to apply hint (${response.status})`);
  }
  return response.json();
}

export async function dismissHint(hintId: string): Promise<Hint> {
  const response = await fetch(`${API_URL}/hints/${hintId}/dismiss`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error(`Failed to dismiss hint (${response.status})`);
  }
  return response.json();
}

export async function deleteHint(hintId: string): Promise<void> {
  const response = await fetch(`${API_URL}/hints/${hintId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete hint (${response.status})`);
  }
}

