import { Injectable } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';

export interface CFDDataPoint {
  timestamp: Date;
  columns: Record<string, number>;
}

export interface ThroughputData {
  period: string;
  completed: number;
  created: number;
}

export interface LeadCycleMetric {
  taskId: string;
  title: string;
  leadTimeDays: number;
  cycleTimeDays: number | null;
  completedAt: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get Cumulative Flow Diagram data for a board
   * Returns daily snapshots of task counts per column
   */
  async getCFDData(boardId: string, days: number = 30): Promise<CFDDataPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get columns for the board
    const columns = await this.prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    });

    // Get task events for the period
    const events = await this.prisma.taskEvent.findMany({
      where: {
        boardId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        taskId: true,
        type: true,
        fromColumnId: true,
        toColumnId: true,
        createdAt: true,
      },
    });

    // Get current task count per column as the baseline
    const currentCounts = await this.prisma.column.findMany({
      where: { boardId },
      include: { _count: { select: { tasks: true } } },
    });

    // Initialize column counts from current state
    const columnCounts: Record<string, number> = {};
    for (const col of currentCounts) {
      columnCounts[col.id] = col._count.tasks;
    }

    // Build daily snapshots
    const dataPoints: CFDDataPoint[] = [];
    const endDate = new Date();
    
    // Generate a data point for each day
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      // For simplicity, use current counts
      // In production, calculate historical counts from events
      const columnData: Record<string, number> = {};
      for (const col of columns) {
        columnData[col.name] = columnCounts[col.id] || 0;
      }

      dataPoints.push({
        timestamp: new Date(dayStart),
        columns: columnData,
      });
    }

    return dataPoints;
  }

  /**
   * Get throughput data (tasks completed per period)
   */
  async getThroughput(boardId: string, periodType: 'day' | 'week' = 'week', periods: number = 12): Promise<ThroughputData[]> {
    const data: ThroughputData[] = [];
    const now = new Date();

    for (let i = periods - 1; i >= 0; i--) {
      const periodStart = new Date(now);
      const periodEnd = new Date(now);

      if (periodType === 'day') {
        periodStart.setDate(now.getDate() - i);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setDate(now.getDate() - i);
        periodEnd.setHours(23, 59, 59, 999);
      } else {
        // Week
        periodStart.setDate(now.getDate() - (i + 1) * 7);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setDate(now.getDate() - i * 7);
        periodEnd.setHours(23, 59, 59, 999);
      }

      const [completed, created] = await Promise.all([
        this.prisma.task.count({
          where: {
            boardId,
            completedAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        }),
        this.prisma.task.count({
          where: {
            boardId,
            createdAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        }),
      ]);

      const periodLabel = periodType === 'day'
        ? periodStart.toISOString().split('T')[0]
        : `W${Math.ceil((now.getDate() - i * 7) / 7)}`;

      data.push({
        period: periodLabel,
        completed,
        created,
      });
    }

    return data;
  }

  /**
   * Get lead time and cycle time metrics
   * Lead time: created → completed
   * Cycle time: first work column → completed
   */
  async getLeadCycleMetrics(boardId: string, limit: number = 50): Promise<LeadCycleMetric[]> {
    const completedTasks = await this.prisma.task.findMany({
      where: {
        boardId,
        isDone: true,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return completedTasks.map((task) => {
      const leadTimeMs = task.completedAt!.getTime() - task.createdAt.getTime();
      const leadTimeDays = Math.round(leadTimeMs / (1000 * 60 * 60 * 24) * 10) / 10;

      // For cycle time, we'd need to track when task first entered a work column
      // For now, use lead time as an approximation
      return {
        taskId: task.id,
        title: task.title,
        leadTimeDays,
        cycleTimeDays: leadTimeDays, // Approximate
        completedAt: task.completedAt!,
      };
    });
  }

  /**
   * Get stale tasks (not moved in X days)
   */
  async getStaleTasks(boardId: string, thresholdDays: number = 7) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - thresholdDays);

    return this.prisma.task.findMany({
      where: {
        boardId,
        isDone: false,
        lastMovedAt: { lt: threshold },
        column: {
          type: { notIn: ['DONE', 'ARCHIVE', 'SOMEDAY'] },
        },
      },
      include: {
        column: { select: { id: true, name: true, type: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { lastMovedAt: 'asc' },
    });
  }

  /**
   * Get WIP breach history
   */
  async getWipBreaches(boardId: string) {
    // Get columns with WIP limits
    const columns = await this.prisma.column.findMany({
      where: {
        boardId,
        wipLimit: { not: null },
      },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    // Current breaches
    const currentBreaches = columns
      .filter((col) => col._count.tasks > (col.wipLimit ?? Infinity))
      .map((col) => ({
        columnId: col.id,
        columnName: col.name,
        currentCount: col._count.tasks,
        wipLimit: col.wipLimit,
        exceededBy: col._count.tasks - (col.wipLimit ?? 0),
      }));

    return {
      currentBreaches,
      totalColumns: columns.length,
      breachingColumns: currentBreaches.length,
    };
  }

  /**
   * Get board summary stats
   */
  async getBoardSummary(boardId: string) {
    const [totalTasks, completedTasks, inProgressTasks, inputTasks, staleTasks] = await Promise.all([
      this.prisma.task.count({ where: { boardId } }),
      this.prisma.task.count({ where: { boardId, isDone: true } }),
      this.prisma.task.count({
        where: {
          boardId,
          isDone: false,
          column: { type: 'CONTEXT' },
        },
      }),
      this.prisma.task.count({
        where: {
          boardId,
          column: { type: 'INPUT' },
        },
      }),
      this.prisma.task.count({
        where: {
          boardId,
          isDone: false,
          stale: true,
        },
      }),
    ]);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      boardId,
      totalTasks,
      completedTasks,
      inProgressTasks,
      inputTasks,
      staleTasks,
      completionRate,
    };
  }
}
