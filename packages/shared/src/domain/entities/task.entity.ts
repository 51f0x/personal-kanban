import { AggregateRoot } from '../base/aggregate-root';
import { TaskId } from '../value-objects/task-id.vo';
import { BoardId } from '../value-objects/board-id.vo';
import { ColumnId } from '../value-objects/column-id.vo';
import { Title } from '../value-objects/title.vo';
import { Description } from '../value-objects/description.vo';
import { Position } from '../value-objects/position.vo';
import { TaskCreatedEvent, TaskMovedEvent, TaskUpdatedEvent, TaskStaleEvent } from '../events';

/**
 * Task Entity
 * Represents a task in the kanban board with business logic
 */
export class Task extends AggregateRoot {
    private _boardId: BoardId;
    private _columnId: ColumnId;
    private _projectId: string | null;
    private _ownerId: string;
    private _title: Title;
    private _description: Description | null;
    private _context: string | null;
    private _waitingFor: string | null;
    private _dueAt: Date | null;
    private _priority: string | null;
    private _duration: string | null;
    private _needsBreakdown: boolean;
    private _metadata: Record<string, unknown> | null;
    private _isDone: boolean;
    private _position: Position;
    private _completedAt: Date | null;
    private _lastMovedAt: Date;
    private _stale: boolean;
    private _createdAt: Date;
    private _updatedAt: Date;

    private _id: string;

    private constructor(
        id: TaskId,
        boardId: BoardId,
        columnId: ColumnId,
        ownerId: string,
        title: Title,
        description: Description | null,
        position: Position,
    ) {
        super();
        this._id = id.value;
        this._boardId = boardId;
        this._columnId = columnId;
        this._ownerId = ownerId;
        this._title = title;
        this._description = description;
        this._position = position;
        this._projectId = null;
        this._context = null;
        this._waitingFor = null;
        this._dueAt = null;
        this._priority = null;
        this._duration = null;
        this._needsBreakdown = false;
        this._metadata = null;
        this._isDone = false;
        this._completedAt = null;
        this._lastMovedAt = new Date();
        this._stale = false;
        this._createdAt = new Date();
        this._updatedAt = new Date();
    }

    /**
     * Factory method to create a new Task
     */
    static create(
        boardId: BoardId,
        columnId: ColumnId,
        ownerId: string,
        title: string,
        description: string | null,
        position: number,
        options?: {
            projectId?: string | null;
            context?: string | null;
            waitingFor?: string | null;
            dueAt?: Date | null;
            priority?: string | null;
            duration?: string | null;
            needsBreakdown?: boolean;
            metadata?: Record<string, unknown> | null;
        },
    ): Task {
        const taskId = TaskId.generate();
        const titleVO = Title.from(title);
        const descriptionVO = description ? Description.from(description) : null;
        const positionVO = Position.from(position);

        const task = new Task(
            taskId,
            boardId,
            columnId,
            ownerId,
            titleVO,
            descriptionVO,
            positionVO,
        );

        if (options) {
            if (options.projectId !== undefined) task._projectId = options.projectId;
            if (options.context !== undefined) task._context = options.context;
            if (options.waitingFor !== undefined) task._waitingFor = options.waitingFor;
            if (options.dueAt !== undefined) task._dueAt = options.dueAt;
            if (options.priority !== undefined) task._priority = options.priority;
            if (options.duration !== undefined) task._duration = options.duration;
            if (options.needsBreakdown !== undefined) task._needsBreakdown = options.needsBreakdown;
            if (options.metadata !== undefined) task._metadata = options.metadata;
        }

        // Raise domain event
        task.addDomainEvent(new TaskCreatedEvent(taskId, boardId, columnId, title, ownerId));

        return task;
    }

    /**
     * Get the task ID
     */
    get id(): string {
        return this._id;
    }

    /**
     * Reconstruct Task from persistence
     */
    static fromPersistence(data: {
        id: string;
        boardId: string;
        columnId: string;
        projectId: string | null;
        ownerId: string;
        title: string;
        description: string | null;
        context: string | null;
        waitingFor: string | null;
        dueAt: Date | null;
        priority: string | null;
        duration: string | null;
        needsBreakdown: boolean;
        metadata: Record<string, unknown> | null;
        isDone: boolean;
        position: number;
        createdAt: Date;
        updatedAt: Date;
        completedAt: Date | null;
        lastMovedAt: Date;
        stale: boolean;
    }): Task {
        const task = Object.create(Task.prototype);
        task._id = data.id;
        task._boardId = BoardId.from(data.boardId);
        task._columnId = ColumnId.from(data.columnId);
        task._projectId = data.projectId;
        task._ownerId = data.ownerId;
        task._title = Title.from(data.title);
        task._description = data.description ? Description.from(data.description) : null;
        task._context = data.context;
        task._waitingFor = data.waitingFor;
        task._dueAt = data.dueAt;
        task._priority = data.priority;
        task._duration = data.duration;
        task._needsBreakdown = data.needsBreakdown;
        task._metadata = data.metadata;
        task._isDone = data.isDone;
        task._position = Position.from(data.position);
        task._createdAt = data.createdAt;
        task._updatedAt = data.updatedAt;
        task._completedAt = data.completedAt;
        task._lastMovedAt = data.lastMovedAt;
        task._stale = data.stale;
        task._domainEvents = [];
        return task;
    }

    /**
     * Move task to a different column
     */
    moveToColumn(
        newColumnId: ColumnId,
        newPosition: number,
        columnType: string,
        wipOverride: boolean = false,
    ): void {
        const oldColumnId = this._columnId;
        const oldPosition = this._position.value;

        this._columnId = newColumnId;
        this._position = Position.from(newPosition);
        this._lastMovedAt = new Date();

        // If moving to a Done column, mark as done
        if (columnType === 'DONE') {
            this._isDone = true;
            this._completedAt = new Date();
        }

        // Raise domain event
        this.addDomainEvent(
            new TaskMovedEvent(
                TaskId.from(this._id),
                this._boardId,
                oldColumnId,
                newColumnId,
                newPosition,
                wipOverride,
            ),
        );
    }

    /**
     * Mark task as stale or not stale
     */
    markStale(isStale: boolean): void {
        if (this._stale === isStale) {
            return; // No change
        }

        this._stale = isStale;
        this._updatedAt = new Date();

        // Raise domain event only when marking as stale
        if (isStale) {
            this.addDomainEvent(new TaskStaleEvent(TaskId.from(this._id), this._boardId, isStale));
        }
    }

    /**
     * Update task properties
     */
    update(updates: {
        title?: string;
        description?: string | null;
        context?: string | null;
        waitingFor?: string | null;
        dueAt?: Date | null;
        priority?: string | null;
        duration?: string | null;
        needsBreakdown?: boolean;
        metadata?: Record<string, unknown> | null;
        projectId?: string | null;
        columnId?: string;
    }): void {
        let hasChanges = false;
        const changes: Record<string, unknown> = {};

        if (updates.title !== undefined && updates.title !== this._title.value) {
            this._title = Title.from(updates.title);
            changes.title = updates.title;
            hasChanges = true;
        }

        if (updates.description !== undefined) {
            const newDescription = updates.description
                ? Description.from(updates.description)
                : null;
            if (this._description?.value !== newDescription?.value) {
                this._description = newDescription;
                changes.description = updates.description;
                hasChanges = true;
            }
        }

        if (updates.context !== undefined && updates.context !== this._context) {
            this._context = updates.context;
            changes.context = updates.context;
            hasChanges = true;
        }

        if (updates.waitingFor !== undefined && updates.waitingFor !== this._waitingFor) {
            this._waitingFor = updates.waitingFor;
            changes.waitingFor = updates.waitingFor;
            hasChanges = true;
        }

        if (updates.dueAt !== undefined && updates.dueAt?.getTime() !== this._dueAt?.getTime()) {
            this._dueAt = updates.dueAt;
            changes.dueAt = updates.dueAt;
            hasChanges = true;
        }

        if (updates.priority !== undefined && updates.priority !== this._priority) {
            this._priority = updates.priority;
            changes.priority = updates.priority;
            hasChanges = true;
        }

        if (updates.duration !== undefined && updates.duration !== this._duration) {
            this._duration = updates.duration;
            changes.duration = updates.duration;
            hasChanges = true;
        }

        if (
            updates.needsBreakdown !== undefined &&
            updates.needsBreakdown !== this._needsBreakdown
        ) {
            this._needsBreakdown = updates.needsBreakdown;
            changes.needsBreakdown = updates.needsBreakdown;
            hasChanges = true;
        }

        if (updates.metadata !== undefined) {
            this._metadata = updates.metadata;
            changes.metadata = updates.metadata;
            hasChanges = true;
        }

        if (updates.projectId !== undefined && updates.projectId !== this._projectId) {
            this._projectId = updates.projectId;
            changes.projectId = updates.projectId;
            hasChanges = true;
        }

        if (updates.columnId !== undefined) {
            const newColumnId = ColumnId.from(updates.columnId);
            if (!this._columnId.equals(newColumnId)) {
                this._columnId = newColumnId;
                changes.columnId = updates.columnId;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            this._updatedAt = new Date();
            this.addDomainEvent(
                new TaskUpdatedEvent(TaskId.from(this._id), this._boardId, changes),
            );
        }
    }

    // Getters
    get boardId(): BoardId {
        return this._boardId;
    }

    get columnId(): ColumnId {
        return this._columnId;
    }

    get projectId(): string | null {
        return this._projectId;
    }

    get ownerId(): string {
        return this._ownerId;
    }

    get title(): string {
        return this._title.value;
    }

    get description(): string | null {
        return this._description?.value ?? null;
    }

    get context(): string | null {
        return this._context;
    }

    get waitingFor(): string | null {
        return this._waitingFor;
    }

    get dueAt(): Date | null {
        return this._dueAt;
    }

    get priority(): string | null {
        return this._priority;
    }

    get duration(): string | null {
        return this._duration;
    }

    get needsBreakdown(): boolean {
        return this._needsBreakdown;
    }

    get metadata(): Record<string, unknown> | null {
        return this._metadata;
    }

    get isDone(): boolean {
        return this._isDone;
    }

    get position(): number {
        return this._position.value;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

    get completedAt(): Date | null {
        return this._completedAt;
    }

    get lastMovedAt(): Date {
        return this._lastMovedAt;
    }

    get stale(): boolean {
        return this._stale;
    }

    /**
     * Convert to persistence format
     */
    toPersistence(): {
        id: string;
        boardId: string;
        columnId: string;
        projectId: string | null;
        ownerId: string;
        title: string;
        description: string | null;
        context: string | null;
        waitingFor: string | null;
        dueAt: Date | null;
        priority: string | null;
        duration: string | null;
        needsBreakdown: boolean;
        metadata: Record<string, unknown> | null;
        isDone: boolean;
        position: number;
        createdAt: Date;
        updatedAt: Date;
        completedAt: Date | null;
        lastMovedAt: Date;
        stale: boolean;
    } {
        return {
            id: this._id,
            boardId: this._boardId.value,
            columnId: this._columnId.value,
            projectId: this._projectId,
            ownerId: this._ownerId,
            title: this._title.value,
            description: this._description?.value ?? null,
            context: this._context,
            waitingFor: this._waitingFor,
            dueAt: this._dueAt,
            priority: this._priority,
            duration: this._duration,
            needsBreakdown: this._needsBreakdown,
            metadata: this._metadata,
            isDone: this._isDone,
            position: this._position.value,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
            completedAt: this._completedAt,
            lastMovedAt: this._lastMovedAt,
            stale: this._stale,
        };
    }
}
