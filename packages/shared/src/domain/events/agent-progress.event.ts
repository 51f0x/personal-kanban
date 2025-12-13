import { DomainEvent } from '../base/domain-event';
import type { BoardId } from '../value-objects/board-id.vo';
import type { TaskId } from '../value-objects/task-id.vo';

/**
 * AgentProgressEvent
 * Published when an agent makes progress processing a task
 */
export class AgentProgressEvent extends DomainEvent {
    public readonly taskId: TaskId;
    public readonly boardId: BoardId;
    public readonly stage: string;
    public readonly progress: number;
    public readonly message: string;
    public readonly details?: Record<string, unknown>;

    constructor(
        taskId: TaskId,
        boardId: BoardId,
        stage: string,
        progress: number,
        message: string,
        details?: Record<string, unknown>,
    ) {
        super(taskId.value);
        this.taskId = taskId;
        this.boardId = boardId;
        this.stage = stage;
        this.progress = progress;
        this.message = message;
        this.details = details;
    }
}
