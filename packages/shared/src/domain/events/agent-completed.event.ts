import { DomainEvent } from '../base/domain-event';
import { TaskId } from '../value-objects/task-id.vo';
import { BoardId } from '../value-objects/board-id.vo';

/**
 * AgentCompletedEvent
 * Published when agent processing completes for a task
 */
export class AgentCompletedEvent extends DomainEvent {
    public readonly taskId: TaskId;
    public readonly boardId: BoardId;
    public readonly processingTimeMs: number;
    public readonly successfulAgents: number;
    public readonly errors?: string[];

    constructor(
        taskId: TaskId,
        boardId: BoardId,
        processingTimeMs: number,
        successfulAgents: number,
        errors?: string[],
    ) {
        super(taskId.value);
        this.taskId = taskId;
        this.boardId = boardId;
        this.processingTimeMs = processingTimeMs;
        this.successfulAgents = successfulAgents;
        this.errors = errors;
    }
}
