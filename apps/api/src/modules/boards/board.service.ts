import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateBoardInput } from './dto/create-board.input';
import { UpdateBoardInput } from './dto/update-board.input';

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  createBoard(input: CreateBoardInput) {
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
      include: { columns: true, projects: true },
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

  updateBoard(input: UpdateBoardInput) {
    const { id, ...data } = input;
    return this.prisma.board.update({
      where: { id },
      data,
    });
  }
}
