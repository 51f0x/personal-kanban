import { DomainEvent } from '../base/domain-event';
import type { BoardId } from '../value-objects/board-id.vo';

/**
 * BoardUpdatedEvent
 * Published when a board is updated
 */
export class BoardUpdatedEvent extends DomainEvent {
    public readonly boardId: BoardId;
    public readonly changes: Record<string, unknown>;

    constructor(boardId: BoardId, changes: Record<string, unknown>) {
        super(boardId.value);
        this.boardId = boardId;
        this.changes = changes;
    }
}
