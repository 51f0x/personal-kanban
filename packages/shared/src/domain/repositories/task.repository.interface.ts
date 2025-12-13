import type { BoardId } from '../value-objects/board-id.vo';
import type { ColumnId } from '../value-objects/column-id.vo';
import type { TaskId } from '../value-objects/task-id.vo';

/**
 * Task data for persistence (matches Prisma Task model structure)
 * This is a temporary type until we create the Task entity in Phase 3
 */
export interface TaskData {
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
}

/**
 * Task with relations (for queries that include related data)
 */
export interface TaskWithRelations extends TaskData {
    column?: {
        id: string;
        name: string;
        type: string;
        wipLimit: number | null;
    };
    project?: {
        id: string;
        name: string;
    } | null;
    tags?: Array<{
        tag: {
            id: string;
            name: string;
            color: string | null;
        };
    }>;
    checklist?: Array<{
        id: string;
        title: string;
        isDone: boolean;
        position: number;
    }>;
    hints?: Array<{
        id: string;
        agentId: string;
        hintType: string;
        title: string | null;
        content: string | null;
        data: Record<string, unknown> | null;
        confidence: number | null;
        applied: boolean;
    }>;
}

/**
 * Options for finding tasks
 */
export interface FindTasksOptions {
    includeColumn?: boolean;
    includeProject?: boolean;
    includeTags?: boolean;
    includeChecklist?: boolean;
    includeHints?: boolean;
}

/**
 * Task Repository Interface
 * Defines the contract for task data access
 */
export interface ITaskRepository {
    /**
     * Find a task by ID
     */
    findById(id: TaskId, options?: FindTasksOptions): Promise<TaskWithRelations | null>;

    /**
     * Find all tasks for a board
     */
    findByBoardId(boardId: BoardId, options?: FindTasksOptions): Promise<TaskWithRelations[]>;

    /**
     * Find all tasks in a column
     */
    findByColumnId(columnId: ColumnId, options?: FindTasksOptions): Promise<TaskWithRelations[]>;

    /**
     * Find tasks by multiple IDs
     */
    findByIds(ids: TaskId[]): Promise<TaskData[]>;

    /**
     * Save a task (create or update)
     */
    save(task: TaskData): Promise<TaskData>;

    /**
     * Create a new task
     */
    create(
        task: Omit<TaskData, 'id' | 'createdAt' | 'updatedAt' | 'lastMovedAt'>,
    ): Promise<TaskData>;

    /**
     * Update an existing task
     */
    update(id: TaskId, data: Partial<TaskData>): Promise<TaskData>;

    /**
     * Delete a task
     */
    delete(id: TaskId): Promise<void>;

    /**
     * Check if a task exists
     */
    exists(id: TaskId): Promise<boolean>;

    /**
     * Count tasks in a column
     */
    countByColumnId(columnId: ColumnId, excludeTaskId?: TaskId): Promise<number>;

    /**
     * Get the maximum position in a column
     */
    getMaxPositionInColumn(columnId: ColumnId): Promise<number>;

    /**
     * Find stale tasks (tasks that haven't been moved recently)
     */
    findStaleTasks(thresholdDays: number): Promise<TaskData[]>;

    /**
     * Update task positions in a column (for reordering)
     */
    updatePositions(updates: Array<{ id: TaskId; position: number }>): Promise<void>;
}
