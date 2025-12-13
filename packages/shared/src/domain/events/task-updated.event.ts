import { DomainEvent } from '../base/domain-event';
import type { BoardId } from '../value-objects/board-id.vo';
import type { TaskId } from '../value-objects/task-id.vo';

/**
 * TaskUpdatedEvent
 * Published when a task is updated
 */
export class TaskUpdatedEvent extends DomainEvent {
    public readonly taskId: TaskId;
    public readonly boardId: BoardId;
    public readonly changes: Record<string, unknown>;

    constructor(taskId: TaskId, boardId: BoardId, changes: Record<string, unknown>) {
        super(taskId.value);
        this.taskId = taskId;
        this.boardId = boardId;
        this.changes = changes;
    }
}
