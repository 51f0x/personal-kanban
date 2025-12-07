import { AggregateRoot } from '../base/aggregate-root';
import { BoardId } from '../value-objects/board-id.vo';
import { BoardUpdatedEvent } from '../events';

/**
 * Board Entity
 * Represents a kanban board with business logic
 */
export class Board extends AggregateRoot {
    private _id: string;
    private _ownerId: string;
    private _name: string;
    private _description: string | null;
    private _config: Record<string, unknown> | null;
    private _createdAt: Date;
    private _updatedAt: Date;

    private constructor(
        id: BoardId,
        ownerId: string,
        name: string,
        description: string | null,
        config: Record<string, unknown> | null,
    ) {
        super();
        this._id = id.value;
        this._ownerId = ownerId;
        this._name = name;
        this._description = description;
        this._config = config;
        this._createdAt = new Date();
        this._updatedAt = new Date();
    }

    /**
     * Factory method to create a new Board
     */
    static create(
        ownerId: string,
        name: string,
        description: string | null = null,
        config: Record<string, unknown> | null = null,
    ): Board {
        const boardId = BoardId.generate();

        if (!name || name.trim().length === 0) {
            throw new Error('Board name cannot be empty');
        }

        if (name.length > 200) {
            throw new Error('Board name cannot exceed 200 characters');
        }

        return new Board(boardId, ownerId, name.trim(), description, config);
    }

    /**
     * Reconstruct Board from persistence
     */
    static fromPersistence(data: {
        id: string;
        ownerId: string;
        name: string;
        description: string | null;
        config: Record<string, unknown> | null;
        createdAt: Date;
        updatedAt: Date;
    }): Board {
        const board = Object.create(Board.prototype);
        board._id = data.id;
        board._ownerId = data.ownerId;
        board._name = data.name;
        board._description = data.description;
        board._config = data.config;
        board._createdAt = data.createdAt;
        board._updatedAt = data.updatedAt;
        board._domainEvents = [];
        return board;
    }

    /**
     * Update board properties
     */
    update(updates: {
        name?: string;
        description?: string | null;
        config?: Record<string, unknown> | null;
    }): void {
        let hasChanges = false;
        const changes: Record<string, unknown> = {};

        if (updates.name !== undefined && updates.name !== this._name) {
            if (!updates.name || updates.name.trim().length === 0) {
                throw new Error('Board name cannot be empty');
            }
            if (updates.name.length > 200) {
                throw new Error('Board name cannot exceed 200 characters');
            }
            this._name = updates.name.trim();
            changes.name = updates.name;
            hasChanges = true;
        }

        if (updates.description !== undefined && updates.description !== this._description) {
            this._description = updates.description;
            changes.description = updates.description;
            hasChanges = true;
        }

        if (updates.config !== undefined) {
            this._config = updates.config;
            changes.config = updates.config;
            hasChanges = true;
        }

        if (hasChanges) {
            this._updatedAt = new Date();
            this.addDomainEvent(new BoardUpdatedEvent(BoardId.from(this._id), changes));
        }
    }

    // Getters
    get id(): string {
        return this._id;
    }

    get ownerId(): string {
        return this._ownerId;
    }

    get name(): string {
        return this._name;
    }

    get description(): string | null {
        return this._description;
    }

    get config(): Record<string, unknown> | null {
        return this._config;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

    /**
     * Convert to persistence format
     */
    toPersistence(): {
        id: string;
        ownerId: string;
        name: string;
        description: string | null;
        config: Record<string, unknown> | null;
        createdAt: Date;
        updatedAt: Date;
    } {
        return {
            id: this._id,
            ownerId: this._ownerId,
            name: this._name,
            description: this._description,
            config: this._config,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
        };
    }
}
