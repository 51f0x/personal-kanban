import { DomainEvent } from '../base/domain-event';
import { TaskId } from '../value-objects/task-id.vo';
import { BoardId } from '../value-objects/board-id.vo';
import { ColumnId } from '../value-objects/column-id.vo';

/**
 * TaskMovedEvent
 * Published when a task is moved to a different column
 */
export class TaskMovedEvent extends DomainEvent {
    public readonly taskId: TaskId;
    public readonly boardId: BoardId;
    public readonly fromColumnId: ColumnId | null;
    public readonly toColumnId: ColumnId;
    public readonly position: number;
    public readonly wipOverride: boolean;

    constructor(
        taskId: TaskId,
        boardId: BoardId,
        fromColumnId: ColumnId | null,
        toColumnId: ColumnId,
        position: number,
        wipOverride: boolean = false,
    ) {
        super(taskId.value);
        this.taskId = taskId;
        this.boardId = boardId;
        this.fromColumnId = fromColumnId;
        this.toColumnId = toColumnId;
        this.position = position;
        this.wipOverride = wipOverride;
    }
}
