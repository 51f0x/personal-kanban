import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if adding a task to a column would violate WIP limits
   */
  async checkWipLimit(columnId: string, excludeTaskId?: string): Promise<WipStatus> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: {
        tasks: {
          where: excludeTaskId ? { id: { not: excludeTaskId } } : undefined,
          select: { id: true },
        },
      },
    });

    if (!column) {
      throw new Error(`Column not found: ${columnId}`);
    }

    const currentCount = column.tasks.length;
    const wipLimit = column.wipLimit;

    // If no WIP limit, always allowed
    if (wipLimit === null) {
      return {
        columnId: column.id,
        columnName: column.name,
        currentCount,
        wipLimit: null,
        allowed: true,
        wouldExceed: false,
      };
    }

    // Check if adding one more would exceed the limit
    const wouldExceed = currentCount >= wipLimit;

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
    const columns = await this.prisma.column.findMany({
      where: { boardId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { position: 'asc' },
    });

    return columns.map((column) => {
      const currentCount = column._count.tasks;
      const wipLimit = column.wipLimit;
      const wouldExceed = wipLimit !== null && currentCount >= wipLimit;

      return {
        columnId: column.id,
        columnName: column.name,
        currentCount,
        wipLimit,
        allowed: !wouldExceed,
        wouldExceed,
      };
    });
  }

  /**
   * Check if a column is currently at or over its WIP limit
   */
  async isAtLimit(columnId: string): Promise<boolean> {
    const status = await this.checkWipLimit(columnId);
    return status.wouldExceed;
  }
}
