import { Injectable, Inject } from '@nestjs/common';
import { IColumnRepository, ITaskRepository, Column, ColumnId, TaskId, BoardId } from '@personal-kanban/shared';

export interface WipStatus {
  columnId: string;
  columnName: string;
  currentCount: number;
  wipLimit: number | null;
  allowed: boolean;
  wouldExceed: boolean;
}

@Injectable()
export class WipService {
  constructor(
    @Inject('IColumnRepository') private readonly columnRepository: IColumnRepository,
    @Inject('ITaskRepository') private readonly taskRepository: ITaskRepository,
  ) {}

  /**
   * Check if adding a task to a column would violate WIP limits
   */
  async checkWipLimit(columnId: string, excludeTaskId?: string): Promise<WipStatus> {
    const columnIdVO = ColumnId.from(columnId);
    const columnData = await this.columnRepository.findById(columnIdVO);

    if (!columnData) {
      throw new Error(`Column not found: ${columnId}`);
    }

    // Convert to Column entity
    const column = Column.fromPersistence(columnData);

    const excludeTaskIdVO = excludeTaskId ? TaskId.from(excludeTaskId) : undefined;
    const currentCount = await this.taskRepository.countByColumnId(columnIdVO, excludeTaskIdVO);
    const wipLimit = column.wipLimit;

    // Use entity's WIP validation method
    const wouldExceed = column.wouldExceedWipLimit(currentCount, excludeTaskId);

    return {
      columnId: column.id,
      columnName: column.name,
      currentCount,
      wipLimit,
      allowed: !wouldExceed,
      wouldExceed,
    };
  }

  /**
   * Get WIP status for all columns in a board
   */
  async getBoardWipStatus(boardId: string): Promise<WipStatus[]> {
    const boardIdVO = BoardId.from(boardId);
    const columnsData = await this.columnRepository.findByBoardIdOrdered(boardIdVO);

    // Get task counts for each column
    const statuses = await Promise.all(
      columnsData.map(async (columnData) => {
        // Convert to Column entity
        const column = Column.fromPersistence(columnData);
        const columnIdVO = ColumnId.from(column.id);
        const currentCount = await this.taskRepository.countByColumnId(columnIdVO);
        const wipLimit = column.wipLimit;
        const wouldExceed = column.isAtWipLimit(currentCount);

        return {
          columnId: column.id,
          columnName: column.name,
          currentCount,
          wipLimit,
          allowed: !wouldExceed,
          wouldExceed,
        };
      }),
    );

    return statuses;
  }

  /**
   * Check if a column is currently at or over its WIP limit
   */
  async isAtLimit(columnId: string): Promise<boolean> {
    const status = await this.checkWipLimit(columnId);
    return status.wouldExceed;
  }
}
