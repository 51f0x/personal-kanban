import type { BoardId } from '../value-objects/board-id.vo';

/**
 * Board data for persistence (matches Prisma Board model structure)
 */
export interface BoardData {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    config: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Board with relations
 */
export interface BoardWithRelations extends BoardData {
    columns?: Array<{
        id: string;
        name: string;
        type: string;
        wipLimit: number | null;
        position: number;
    }>;
    projects?: Array<{
        id: string;
        name: string;
        description: string | null;
    }>;
}

/**
 * Options for finding boards
 */
export interface FindBoardsOptions {
    includeColumns?: boolean;
    includeProjects?: boolean;
}

/**
 * Board Repository Interface
 */
export interface IBoardRepository {
    /**
     * Find a board by ID
     */
    findById(id: BoardId, options?: FindBoardsOptions): Promise<BoardWithRelations | null>;

    /**
     * Find all boards for an owner
     */
    findByOwnerId(ownerId: string, options?: FindBoardsOptions): Promise<BoardWithRelations[]>;

    /**
     * Save a board (create or update)
     */
    save(board: BoardData): Promise<BoardData>;

    /**
     * Create a new board
     */
    create(board: Omit<BoardData, 'id' | 'createdAt' | 'updatedAt'>): Promise<BoardData>;

    /**
     * Update an existing board
     */
    update(id: BoardId, data: Partial<BoardData>): Promise<BoardData>;

    /**
     * Delete a board
     */
    delete(id: BoardId): Promise<void>;

    /**
     * Check if a board exists
     */
    exists(id: BoardId): Promise<boolean>;
}
