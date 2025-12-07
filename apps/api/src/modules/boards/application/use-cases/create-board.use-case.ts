import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@personal-kanban/shared';
import { CreateBoardDto } from '../../dto/create-board.input';
import {
    IBoardRepository,
    IEventBus,
    Board,
} from '@personal-kanban/shared';

/**
 * CreateBoardUseCase
 * Encapsulates the business logic for creating a new board
 */
@Injectable()
export class CreateBoardUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject('IBoardRepository') private readonly boardRepository: IBoardRepository,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
    ) {}

    async execute(input: CreateBoardDto) {
        const config = input.config 
            ? (typeof input.config === 'object' ? input.config as Record<string, unknown> : null)
            : null;

        // Create Board entity using factory method
        const board = Board.create(
            input.ownerId,
            input.name,
            input.description ?? null,
            config,
        );

        // Persist board
        const boardData = board.toPersistence();
        const persistedBoard = await this.prisma.board.create({
            data: {
                id: boardData.id,
                ownerId: boardData.ownerId,
                name: boardData.name,
                description: boardData.description,
                config: boardData.config 
                    ? (boardData.config as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
                createdAt: boardData.createdAt,
                updatedAt: boardData.updatedAt,
            },
        });

        // Publish domain events from the entity
        const domainEvents = board.domainEvents;
        if (domainEvents.length > 0) {
            await this.eventBus.publishAll([...domainEvents]);
            board.clearDomainEvents();
        }

        // Map to Prisma format for backward compatibility
        return {
            ...persistedBoard,
            config: persistedBoard.config ?? Prisma.JsonNull,
        };
    }
}
