import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import type { Column, ColumnType } from './types';

export interface CreateColumnPayload {
    name: string;
    type?: ColumnType;
    position?: number;
    wipLimit?: number | null;
}

export interface UpdateColumnPayload {
    name?: string;
    type?: ColumnType;
    position?: number;
    wipLimit?: number | null;
}

export async function fetchColumn(columnId: string): Promise<Column> {
    return apiGet<Column>(`/columns/${columnId}`);
}

export async function fetchColumnsForBoard(boardId: string): Promise<Column[]> {
    return apiGet<Column[]>(`/boards/${boardId}/columns`);
}

export async function createColumn(boardId: string, payload: CreateColumnPayload): Promise<Column> {
    return apiPost<Column>(`/boards/${boardId}/columns`, payload);
}

export async function updateColumn(
    columnId: string,
    payload: UpdateColumnPayload,
): Promise<Column> {
    return apiPatch<Column>(`/columns/${columnId}`, payload);
}

export async function deleteColumn(columnId: string): Promise<void> {
    await apiDelete(`/columns/${columnId}`);
}

export interface ReorderColumnsPayload {
    columnIds: string[];
}

export async function reorderColumns(
    boardId: string,
    payload: ReorderColumnsPayload,
): Promise<Column[]> {
    return apiPost<Column[]>(`/boards/${boardId}/columns/reorder`, payload);
}
