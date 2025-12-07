import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ColumnType } from '@prisma/client';
import { PrismaService } from '@personal-kanban/shared';
import { CreateColumnDto } from './dto/create-column.input';
import { UpdateColumnDto, ReorderColumnsDto } from './dto/update-column.input';
import { IColumnRepository, Column, ColumnId, BoardId } from '@personal-kanban/shared';

@Injectable()
export class ColumnService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IColumnRepository') private readonly columnRepository: IColumnRepository,
  ) {}

  async createColumn(input: CreateColumnDto) {
    const boardId = BoardId.from(input.boardId);
    
    // Get the max position for the board if not specified
    let position = input.position;
    if (position === undefined) {
      const columns = await this.columnRepository.findByBoardId(boardId);
      const maxPosition = columns.length > 0 
        ? Math.max(...columns.map(c => c.position))
        : -1;
      position = maxPosition + 1;
    }

    // Create Column entity using factory method
    const column = Column.create(
      boardId,
      input.name,
      (input.type ?? ColumnType.CONTEXT) as string,
      input.wipLimit ?? null,
      position,
    );

    // Persist column
    const columnData = column.toPersistence();
    const persistedColumn = await this.columnRepository.create({
      boardId: columnData.boardId,
      name: columnData.name,
      type: columnData.type,
      wipLimit: columnData.wipLimit,
      position: columnData.position,
    });

    return persistedColumn;
  }

  async getColumn(id: string) {
    const columnId = ColumnId.from(id);
    const column = await this.columnRepository.findById(columnId);

    if (!column) {
      throw new NotFoundException(`Column not found: ${id}`);
    }

    // Get tasks for this column (using Prisma for now since we need relations)
    // TODO: In Phase 3, use ITaskRepository.findByColumnId with relations
    const tasks = await this.prisma.task.findMany({
      where: { columnId: id },
      orderBy: { lastMovedAt: 'asc' },
      include: {
        tags: { include: { tag: true } },
        project: true,
      },
    });

    const taskCount = await this.prisma.task.count({
      where: { columnId: id },
    });

    return {
      ...column,
      tasks,
      _count: { tasks: taskCount },
    };
  }

  async listColumnsForBoard(boardId: string) {
    const boardIdVO = BoardId.from(boardId);
    const columns = await this.columnRepository.findByBoardIdOrdered(boardIdVO);

    // Get task counts for each column
    const columnsWithCounts = await Promise.all(
      columns.map(async (column) => {
        const taskCount = await this.prisma.task.count({
          where: { columnId: column.id },
        });
        return {
          ...column,
          _count: { tasks: taskCount },
        };
      }),
    );

    return columnsWithCounts;
  }

  async updateColumn(id: string, input: UpdateColumnDto) {
    const columnId = ColumnId.from(id);
    const columnData = await this.columnRepository.findById(columnId);
    
    if (!columnData) {
      throw new NotFoundException(`Column not found: ${id}`);
    }

    // Convert to Column entity
    const column = Column.fromPersistence(columnData);

    // Use entity's update method
    column.update({
      name: input.name,
      type: input.type as string | undefined,
      wipLimit: input.wipLimit,
      position: input.position,
    });

    // Persist changes
    const updatedData = column.toPersistence();
    return this.columnRepository.update(columnId, {
      name: updatedData.name,
      type: updatedData.type,
      wipLimit: updatedData.wipLimit,
      position: updatedData.position,
    });
  }

  async deleteColumn(id: string) {
    const columnId = ColumnId.from(id);
    const column = await this.columnRepository.findById(columnId);

    if (!column) {
      throw new NotFoundException(`Column not found: ${id}`);
    }

    // Get task count (using Prisma for now)
    const taskCount = await this.prisma.task.count({
      where: { columnId: id },
    });

    // Don't allow deleting columns with tasks
    if (taskCount > 0) {
      throw new BadRequestException(
        `Cannot delete column "${column.name}" because it contains ${taskCount} task(s). Move or delete them first.`,
      );
    }

    // Don't allow deleting the last INPUT column
    if (column.type === ColumnType.INPUT) {
      const boardId = BoardId.from(column.boardId);
      const allColumns = await this.columnRepository.findByBoardId(boardId);
      const inputColumnCount = allColumns.filter(c => c.type === ColumnType.INPUT).length;
      if (inputColumnCount <= 1) {
        throw new BadRequestException('Cannot delete the only Input column on the board.');
      }
    }

    await this.columnRepository.delete(columnId);

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
    const boardIdVO = BoardId.from(boardId);
    const columns = await this.columnRepository.findByBoardId(boardIdVO);

    const existingIds = new Set(columns.map((c) => c.id));
    for (const id of input.columnIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Column ${id} does not belong to board ${boardId}`);
      }
    }

    // Update positions in a transaction
    // Note: Repository methods don't support transactions yet, so we use Prisma directly
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
