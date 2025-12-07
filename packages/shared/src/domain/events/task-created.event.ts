import { DomainEvent } from '../base/domain-event';
import { TaskId } from '../value-objects/task-id.vo';
import { BoardId } from '../value-objects/board-id.vo';
import { ColumnId } from '../value-objects/column-id.vo';

/**
 * TaskCreatedEvent
 * Published when a new task is created
 */
export class TaskCreatedEvent extends DomainEvent {
    public readonly taskId: TaskId;
    public readonly boardId: BoardId;
    public readonly columnId: ColumnId;
    public readonly title: string;
    public readonly ownerId: string;

    constructor(
        taskId: TaskId,
        boardId: BoardId,
        columnId: ColumnId,
        title: string,
        ownerId: string,
    ) {
        super(taskId.value);
        this.taskId = taskId;
        this.boardId = boardId;
        this.columnId = columnId;
        this.title = title;
        this.ownerId = ownerId;
    }
}
