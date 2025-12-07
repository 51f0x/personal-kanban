import { AggregateRoot } from '../base/aggregate-root';
import { ColumnId } from '../value-objects/column-id.vo';
import { BoardId } from '../value-objects/board-id.vo';
import { WipLimit } from '../value-objects/wip-limit.vo';
import { Position } from '../value-objects/position.vo';

/**
 * Column Entity
 * Represents a column in a kanban board with business logic
 */
export class Column extends AggregateRoot {
    private _id: string;
    private _boardId: BoardId;
    private _name: string;
    private _type: string;
    private _wipLimit: WipLimit | null;
    private _position: Position;
    private _createdAt: Date;

    private constructor(
        id: ColumnId,
        boardId: BoardId,
        name: string,
        type: string,
        wipLimit: WipLimit | null,
        position: Position,
    ) {
        super();
        this._id = id.value;
        this._boardId = boardId;
        this._name = name;
        this._type = type;
        this._wipLimit = wipLimit;
        this._position = position;
        this._createdAt = new Date();
    }

    /**
     * Factory method to create a new Column
     */
    static create(
        boardId: BoardId,
        name: string,
        type: string,
        wipLimit: number | null,
        position: number,
    ): Column {
        const columnId = ColumnId.generate();

        if (!name || name.trim().length === 0) {
            throw new Error('Column name cannot be empty');
        }

        if (name.length > 100) {
            throw new Error('Column name cannot exceed 100 characters');
        }

        const validTypes = ['INPUT', 'CLARIFY', 'CONTEXT', 'WAITING', 'SOMEDAY', 'DONE', 'ARCHIVE'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid column type: ${type}`);
        }

        const wipLimitVO = wipLimit !== null ? WipLimit.from(wipLimit) : null;
        const positionVO = Position.from(position);

        return new Column(columnId, boardId, name.trim(), type, wipLimitVO, positionVO);
    }

    /**
     * Reconstruct Column from persistence
     */
    static fromPersistence(data: {
        id: string;
        boardId: string;
        name: string;
        type: string;
        wipLimit: number | null;
        position: number;
        createdAt: Date;
    }): Column {
        const column = Object.create(Column.prototype);
        column._id = data.id;
        column._boardId = BoardId.from(data.boardId);
        column._name = data.name;
        column._type = data.type;
        column._wipLimit = data.wipLimit !== null ? WipLimit.from(data.wipLimit) : null;
        column._position = Position.from(data.position);
        column._createdAt = data.createdAt;
        column._domainEvents = [];
        return column;
    }

    /**
     * Check if adding a task would exceed WIP limit
     */
    wouldExceedWipLimit(currentTaskCount: number, excludeTaskId?: string): boolean {
        if (this._wipLimit === null) {
            return false; // No WIP limit
        }

        // If excluding a task, we're moving it, so count stays the same
        const effectiveCount = excludeTaskId ? currentTaskCount : currentTaskCount + 1;
        return effectiveCount > this._wipLimit.value;
    }

    /**
     * Check if column is at or over WIP limit
     */
    isAtWipLimit(currentTaskCount: number): boolean {
        if (this._wipLimit === null) {
            return false; // No WIP limit
        }
        return currentTaskCount >= this._wipLimit.value;
    }

    /**
     * Update column properties
     */
    update(updates: {
        name?: string;
        type?: string;
        wipLimit?: number | null;
        position?: number;
    }): void {
        if (updates.name !== undefined && updates.name !== this._name) {
            if (!updates.name || updates.name.trim().length === 0) {
                throw new Error('Column name cannot be empty');
            }
            if (updates.name.length > 100) {
                throw new Error('Column name cannot exceed 100 characters');
            }
            this._name = updates.name.trim();
        }

        if (updates.type !== undefined && updates.type !== this._type) {
            const validTypes = [
                'INPUT',
                'CLARIFY',
                'CONTEXT',
                'WAITING',
                'SOMEDAY',
                'DONE',
                'ARCHIVE',
            ];
            if (!validTypes.includes(updates.type)) {
                throw new Error(`Invalid column type: ${updates.type}`);
            }
            this._type = updates.type;
        }

        if (updates.wipLimit !== undefined) {
            this._wipLimit = updates.wipLimit !== null ? WipLimit.from(updates.wipLimit) : null;
        }

        if (updates.position !== undefined) {
            this._position = Position.from(updates.position);
        }
    }

    // Getters
    get id(): string {
        return this._id;
    }

    get boardId(): BoardId {
        return this._boardId;
    }

    get name(): string {
        return this._name;
    }

    get type(): string {
        return this._type;
    }

    get wipLimit(): number | null {
        return this._wipLimit?.value ?? null;
    }

    get position(): number {
        return this._position.value;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    /**
     * Convert to persistence format
     */
    toPersistence(): {
        id: string;
        boardId: string;
        name: string;
        type: string;
        wipLimit: number | null;
        position: number;
        createdAt: Date;
    } {
        return {
            id: this._id,
            boardId: this._boardId.value,
            name: this._name,
            type: this._type,
            wipLimit: this._wipLimit?.value ?? null,
            position: this._position.value,
            createdAt: this._createdAt,
        };
    }
}
