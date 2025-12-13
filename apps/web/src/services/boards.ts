import { apiDelete, apiGet, apiPatch, apiPost } from './api';
import type { Board, ColumnType } from './types';

export async function fetchBoards(ownerId: string): Promise<Board[]> {
    return apiGet<Board[]>(`/boards?ownerId=${encodeURIComponent(ownerId)}`);
}

export async function fetchBoardById(boardId: string): Promise<Board> {
    return apiGet<Board>(`/boards/${boardId}`);
}

export interface CreateBoardPayload {
    ownerId: string;
    name: string;
    description?: string;
}

export interface CreateColumnPayload {
    name: string;
    type: ColumnType;
    position: number;
    wipLimit?: number | null;
}

export async function createBoard(payload: CreateBoardPayload): Promise<Board> {
    return apiPost<Board>('/boards', payload);
}

export async function createColumn(boardId: string, payload: CreateColumnPayload): Promise<void> {
    await apiPost(`/boards/${boardId}/columns`, payload);
}

/**
 * Create a board with default columns for a user
 */
export async function createBoardWithDefaultColumns(
    ownerId: string,
    userName: string,
): Promise<Board> {
    // Create the board
    const board = await createBoard({
        ownerId,
        name: `${userName.split(' ')[0] ?? 'My'} board`,
    });

    // Create default columns
    const defaultColumns: Array<{ name: string; type: ColumnType; position: number }> = [
        { name: 'Input', type: 'INPUT', position: 0 },
        { name: 'Next actions', type: 'CLARIFY', position: 1 },
        { name: 'In progress', type: 'CONTEXT', position: 2 },
        { name: 'Done', type: 'DONE', position: 99 },
    ];

    // Create all columns
    await Promise.all(
        defaultColumns.map((col) =>
            createColumn(board.id, {
                name: col.name,
                type: col.type,
                position: col.position,
            }),
        ),
    );

    // Fetch the board again to get the columns
    return fetchBoardById(board.id);
}

export interface UpdateBoardPayload {
    name?: string;
    description?: string | null;
}

export async function updateBoard(boardId: string, payload: UpdateBoardPayload): Promise<Board> {
    return apiPatch<Board>(`/boards/${boardId}`, payload);
}

export async function deleteBoard(boardId: string): Promise<void> {
    await apiDelete(`/boards/${boardId}`);
}
