import { DomainEvent } from '../base/domain-event';
import type { BoardId } from '../value-objects/board-id.vo';
import type { TaskId } from '../value-objects/task-id.vo';

/**
 * TaskStaleEvent
 * Published when a task is marked as stale
 */
export class TaskStaleEvent extends DomainEvent {
    public readonly taskId: TaskId;
    public readonly boardId: BoardId;
    public readonly isStale: boolean;

    constructor(taskId: TaskId, boardId: BoardId, isStale: boolean) {
        super(taskId.value);
        this.taskId = taskId;
        this.boardId = boardId;
        this.isStale = isStale;
    }
}
