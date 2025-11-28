import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ColumnType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateColumnDto } from './dto/create-column.input';
import { UpdateColumnDto, ReorderColumnsDto } from './dto/update-column.input';

@Injectable()
export class ColumnService {
  constructor(private readonly prisma: PrismaService) {}

  async createColumn(input: CreateColumnDto) {
    // Get the max position for the board if not specified
    let position = input.position;
    if (position === undefined) {
      const maxPosition = await this.prisma.column.aggregate({
        where: { boardId: input.boardId },
        _max: { position: true },
      });
      position = (maxPosition._max.position ?? -1) + 1;
    }

    return this.prisma.column.create({
      data: {
        boardId: input.boardId,
        name: input.name,
        type: input.type ?? ColumnType.CONTEXT,
        wipLimit: input.wipLimit ?? null,
        position,
      },
    });
  }

  async getColumn(id: string) {
    const column = await this.prisma.column.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { lastMovedAt: 'asc' },
          include: {
            tags: { include: { tag: true } },
            project: true,
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!column) {
      throw new NotFoundException(`Column not found: ${id}`);
    }

    return column;
  }

  async listColumnsForBoard(boardId: string) {
    return this.prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });
  }

  async updateColumn(id: string, input: UpdateColumnDto) {
    const column = await this.prisma.column.findUnique({ where: { id } });
    if (!column) {
      throw new NotFoundException(`Column not found: ${id}`);
    }

    return this.prisma.column.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        wipLimit: input.wipLimit,
        position: input.position,
      },
    });
  }

  async deleteColumn(id: string) {
    const column = await this.prisma.column.findUnique({
      where: { id },
      include: { _count: { select: { tasks: true } } },
    });

    if (!column) {
      throw new NotFoundException(`Column not found: ${id}`);
    }

    // Don't allow deleting columns with tasks
    if (column._count.tasks > 0) {
      throw new BadRequestException(
        `Cannot delete column "${column.name}" because it contains ${column._count.tasks} task(s). Move or delete them first.`,
      );
    }

    // Don't allow deleting the last INPUT column
    if (column.type === ColumnType.INPUT) {
      const inputColumnCount = await this.prisma.column.count({
        where: { boardId: column.boardId, type: ColumnType.INPUT },
      });
      if (inputColumnCount <= 1) {
        throw new BadRequestException('Cannot delete the only Input column on the board.');
      }
    }

    await this.prisma.column.delete({ where: { id } });

    // Re-order remaining columns to fill the gap
    await this.prisma.$executeRaw`
      UPDATE "Column"
      SET position = position - 1
      WHERE "boardId" = ${column.boardId}::uuid
      AND position > ${column.position}
    `;

    return { success: true, deletedId: id };
  }

  async reorderColumns(boardId: string, input: ReorderColumnsDto) {
    // Verify all columns belong to the board
    const columns = await this.prisma.column.findMany({
      where: { boardId },
      select: { id: true },
    });

    const existingIds = new Set(columns.map((c) => c.id));
    for (const id of input.columnIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Column ${id} does not belong to board ${boardId}`);
      }
    }

    // Update positions in a transaction
    await this.prisma.$transaction(
      input.columnIds.map((columnId, index) =>
        this.prisma.column.update({
          where: { id: columnId },
          data: { position: index },
        }),
      ),
    );

    return this.listColumnsForBoard(boardId);
  }
}
