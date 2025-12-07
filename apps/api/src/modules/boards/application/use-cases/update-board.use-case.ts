import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UpdateBoardDto } from '../../dto/update-board.input';
import {
    IBoardRepository,
    IEventBus,
    Board,
    BoardId,
} from '@personal-kanban/shared';

/**
 * UpdateBoardUseCase
 * Encapsulates the business logic for updating a board
 */
@Injectable()
export class UpdateBoardUseCase {
    constructor(
        @Inject('IBoardRepository') private readonly boardRepository: IBoardRepository,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
    ) {}

    async execute(id: string, input: UpdateBoardDto) {
        const boardId = BoardId.from(id);
        
        // Load board data from repository
        const boardData = await this.boardRepository.findById(boardId);
        if (!boardData) {
            throw new Error(`Board not found: ${id}`);
        }

        // Convert to Board entity
        const board = Board.fromPersistence(boardData);

        // Use entity's update method
        board.update({
            name: input.name,
            description: input.description === undefined ? undefined : input.description,
            config:
                input.config === undefined
                    ? undefined
                    : input.config === null
                      ? null
                      : (typeof input.config === 'object' ? input.config as Record<string, unknown> : undefined),
        });

        // Persist changes
        const updatedData = board.toPersistence();
        const updated = await this.boardRepository.update(boardId, updatedData);

        // Publish domain events from the entity
        const domainEvents = board.domainEvents;
        if (domainEvents.length > 0) {
            await this.eventBus.publishAll([...domainEvents]);
            board.clearDomainEvents();
        }

        // Map to Prisma format for backward compatibility
        return {
            ...updated,
            config: updated.config ?? Prisma.JsonNull,
        };
    }
}
