import { Injectable } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import { IColumnRepository, ColumnData } from '@personal-kanban/shared';
import { ColumnId } from '@personal-kanban/shared';
import { BoardId } from '@personal-kanban/shared';

/**
 * Prisma implementation of IColumnRepository
 */
@Injectable()
export class PrismaColumnRepository implements IColumnRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: ColumnId): Promise<ColumnData | null> {
        const column = await this.prisma.column.findUnique({
            where: { id: id.value },
        });

        if (!column) {
            return null;
        }

        return this.mapToColumnData(column);
    }

    async findByBoardId(boardId: BoardId): Promise<ColumnData[]> {
        const columns = await this.prisma.column.findMany({
            where: { boardId: boardId.value },
        });

        return columns.map((column) => this.mapToColumnData(column));
    }

    async findByBoardIdOrdered(boardId: BoardId): Promise<ColumnData[]> {
        const columns = await this.prisma.column.findMany({
            where: { boardId: boardId.value },
            orderBy: { position: 'asc' },
        });

        return columns.map((column) => this.mapToColumnData(column));
    }

    async save(column: ColumnData): Promise<ColumnData> {
        if (await this.exists(ColumnId.from(column.id))) {
            return this.update(ColumnId.from(column.id), column);
        }
        return this.create(column);
    }

    async create(column: Omit<ColumnData, 'id' | 'createdAt'>): Promise<ColumnData> {
        const created = await this.prisma.column.create({
            data: {
                boardId: column.boardId,
                name: column.name,
                type: column.type as any,
                wipLimit: column.wipLimit,
                position: column.position,
            },
        });

        return this.mapToColumnData(created);
    }

    async update(id: ColumnId, data: Partial<ColumnData>): Promise<ColumnData> {
        const updateData: any = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.type !== undefined) updateData.type = data.type as any;
        if (data.wipLimit !== undefined) updateData.wipLimit = data.wipLimit;
        if (data.position !== undefined) updateData.position = data.position;

        const updated = await this.prisma.column.update({
            where: { id: id.value },
            data: updateData,
        });

        return this.mapToColumnData(updated);
    }

    async delete(id: ColumnId): Promise<void> {
        await this.prisma.column.delete({
            where: { id: id.value },
        });
    }

    async exists(id: ColumnId): Promise<boolean> {
        const count = await this.prisma.column.count({
            where: { id: id.value },
        });
        return count > 0;
    }

    async belongsToBoard(columnId: ColumnId, boardId: BoardId): Promise<boolean> {
        const column = await this.findById(columnId);
        return column?.boardId === boardId.value;
    }

    /**
     * Map Prisma column to ColumnData
     */
    private mapToColumnData(column: any): ColumnData {
        return {
            id: column.id,
            boardId: column.boardId,
            name: column.name,
            type: column.type,
            wipLimit: column.wipLimit,
            position: column.position,
            createdAt: column.createdAt,
        };
    }
}
