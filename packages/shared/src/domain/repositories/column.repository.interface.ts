import { ColumnId } from '../value-objects/column-id.vo';
import { BoardId } from '../value-objects/board-id.vo';

/**
 * Column data for persistence (matches Prisma Column model structure)
 */
export interface ColumnData {
    id: string;
    boardId: string;
    name: string;
    type: string;
    wipLimit: number | null;
    position: number;
    createdAt: Date;
}

/**
 * Column Repository Interface
 */
export interface IColumnRepository {
    /**
     * Find a column by ID
     */
    findById(id: ColumnId): Promise<ColumnData | null>;

    /**
     * Find all columns for a board
     */
    findByBoardId(boardId: BoardId): Promise<ColumnData[]>;

    /**
     * Find columns by board ID, ordered by position
     */
    findByBoardIdOrdered(boardId: BoardId): Promise<ColumnData[]>;

    /**
     * Save a column (create or update)
     */
    save(column: ColumnData): Promise<ColumnData>;

    /**
     * Create a new column
     */
    create(column: Omit<ColumnData, 'id' | 'createdAt'>): Promise<ColumnData>;

    /**
     * Update an existing column
     */
    update(id: ColumnId, data: Partial<ColumnData>): Promise<ColumnData>;

    /**
     * Delete a column
     */
    delete(id: ColumnId): Promise<void>;

    /**
     * Check if a column exists
     */
    exists(id: ColumnId): Promise<boolean>;

    /**
     * Check if a column belongs to a board
     */
    belongsToBoard(columnId: ColumnId, boardId: BoardId): Promise<boolean>;
}
