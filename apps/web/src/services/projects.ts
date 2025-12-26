import { apiDelete, apiGet, apiPatch, apiPost } from './api';
import type { Project } from './types';

export async function fetchProjects(boardId: string): Promise<Project[]> {
    return apiGet<Project[]>(`/boards/${boardId}/projects`);
}

export async function fetchProjectById(projectId: string): Promise<Project> {
    return apiGet<Project>(`/projects/${projectId}`);
}

export interface CreateProjectPayload {
    boardId: string;
    ownerId: string;
    name: string;
    description?: string;
    desiredOutcome?: string;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
    return apiPost<Project>(`/boards/${payload.boardId}/projects`, {
        ownerId: payload.ownerId,
        name: payload.name,
        description: payload.description,
        desiredOutcome: payload.desiredOutcome,
    });
}

export interface UpdateProjectPayload {
    name?: string;
    description?: string | null;
    desiredOutcome?: string | null;
    status?: string;
}

export async function updateProject(
    projectId: string,
    payload: UpdateProjectPayload,
): Promise<Project> {
    return apiPatch<Project>(`/projects/${projectId}`, payload);
}

export async function deleteProject(projectId: string): Promise<void> {
    await apiDelete(`/projects/${projectId}`);
}

