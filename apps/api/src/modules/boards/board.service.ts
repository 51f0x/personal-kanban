import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BoardGateway } from '../realtime/board.gateway';
import { CreateBoardDto } from './dto/create-board.input';
import { UpdateBoardDto } from './dto/update-board.input';

@Injectable()
export class BoardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly boardGateway: BoardGateway,
    ) {}

    createBoard(input: CreateBoardDto) {
        return this.prisma.board.create({
            data: {
                ownerId: input.ownerId,
                name: input.name,
                description: input.description,
                config: input.config ?? Prisma.JsonNull,
            },
        });
    }

    listBoardsForOwner(ownerId: string) {
        return this.prisma.board.findMany({
            where: { ownerId },
            orderBy: { createdAt: 'asc' },
            include: {
                columns: { orderBy: { position: 'asc' } },
                projects: true,
            },
        });
    }

    getBoardById(id: string) {
        return this.prisma.board.findUnique({
            where: { id },
            include: {
                columns: { orderBy: { position: 'asc' } },
                projects: true,
            },
        });
    }

    async updateBoard(id: string, input: UpdateBoardDto) {
        const data: Prisma.BoardUpdateInput = {
            name: input.name,
            description: input.description === undefined ? undefined : input.description,
            config:
                input.config === undefined
                    ? undefined
                    : input.config === null
                      ? Prisma.JsonNull
                      : input.config,
        };

        const updatedBoard = await this.prisma.board.update({
            where: { id },
            data,
        });

        // Emit realtime update event
        this.boardGateway.emitBoardUpdate(id, {
            type: 'board.updated',
            boardId: id,
        });

        return updatedBoard;
    }

    deleteBoard(id: string) {
        // Prisma will cascade delete related records (columns, tasks, etc.) based on schema
        return this.prisma.board.delete({
            where: { id },
        });
    }
}
