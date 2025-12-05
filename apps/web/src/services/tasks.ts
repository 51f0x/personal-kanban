import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import { Task, MoveTaskResult, WipStatus } from './types';

export async function fetchTasks(boardId: string): Promise<Task[]> {
    return apiGet<Task[]>(`/boards/${boardId}/tasks`);
}

export async function moveTask(
    taskId: string,
    columnId: string,
    forceWipOverride: boolean = false,
    position?: number,
): Promise<MoveTaskResult> {
    return apiPost<MoveTaskResult>(`/tasks/${taskId}/move`, {
        columnId,
        forceWipOverride,
        position,
    });
}

export async function fetchWipStatus(boardId: string): Promise<WipStatus[]> {
    return apiGet<WipStatus[]>(`/boards/${boardId}/wip-status`);
}

export async function deleteTask(taskId: string): Promise<void> {
    return apiDelete<void>(`/tasks/${taskId}`);
}

export async function fetchTaskById(taskId: string): Promise<Task> {
    return apiGet<Task>(`/tasks/${taskId}`);
}

export async function updateTask(
    taskId: string,
    updates: Partial<
        Pick<
            Task,
            | 'title'
            | 'description'
            | 'context'
            | 'dueAt'
            | 'isDone'
            | 'waitingFor'
            | 'needsBreakdown'
            | 'projectId'
            | 'columnId'
            | 'priority'
            | 'duration'
        >
    >,
): Promise<Task> {
    return apiPatch<Task>(`/tasks/${taskId}`, updates);
}

export interface CreateTaskPayload {
    boardId: string;
    columnId: string;
    ownerId: string;
    title: string;
    description?: string;
    projectId?: string;
    context?: Task['context'];
    waitingFor?: string;
    dueAt?: string;
    needsBreakdown?: boolean;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
    return apiPost<Task>('/tasks', payload);
}
