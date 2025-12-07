import { DomainEvent } from '../base/domain-event';
import { TaskId } from '../value-objects/task-id.vo';
import { BoardId } from '../value-objects/board-id.vo';

/**
 * TaskDeletedEvent
 * Published when a task is deleted
 */
export class TaskDeletedEvent extends DomainEvent {
    public readonly taskId: TaskId;
    public readonly boardId: BoardId;

    constructor(taskId: TaskId, boardId: BoardId) {
        super(taskId.value);
        this.taskId = taskId;
        this.boardId = boardId;
    }
}
