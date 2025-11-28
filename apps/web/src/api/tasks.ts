import { Task, MoveTaskResult, WipStatus } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export async function fetchTasks(boardId: string): Promise<Task[]> {
  const response = await fetch(`${API_URL}/boards/${boardId}/tasks`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks (${response.status})`);
  }
  return response.json();
}

export async function moveTask(
  taskId: string,
  columnId: string,
  forceWipOverride: boolean = false
): Promise<MoveTaskResult> {
  const response = await fetch(`${API_URL}/tasks/${taskId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnId, forceWipOverride }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Move failed' }));
    throw new Error(error.message || `Failed to move task (${response.status})`);
  }
  
  return response.json();
}

export async function fetchWipStatus(boardId: string): Promise<WipStatus[]> {
  const response = await fetch(`${API_URL}/boards/${boardId}/wip-status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch WIP status (${response.status})`);
  }
  return response.json();
}

export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete task (${response.status})`);
  }
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'context' | 'dueAt' | 'isDone'>>
): Promise<Task> {
  const response = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error(`Failed to update task (${response.status})`);
  }
  return response.json();
}
