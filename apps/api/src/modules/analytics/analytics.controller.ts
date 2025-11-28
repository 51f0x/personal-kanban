import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get board summary statistics
   */
  @Get('boards/:boardId/analytics/summary')
  getSummary(@Param('boardId') boardId: string) {
    return this.analyticsService.getBoardSummary(boardId);
  }

  /**
   * Get Cumulative Flow Diagram data
   */
  @Get('boards/:boardId/analytics/cfd')
  getCFD(
    @Param('boardId') boardId: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getCFDData(boardId, numDays);
  }

  /**
   * Get throughput data (completed tasks per period)
   */
  @Get('boards/:boardId/analytics/throughput')
  getThroughput(
    @Param('boardId') boardId: string,
    @Query('period') period?: 'day' | 'week',
    @Query('periods') periods?: string,
  ) {
    const numPeriods = periods ? parseInt(periods, 10) : 12;
    return this.analyticsService.getThroughput(boardId, period ?? 'week', numPeriods);
  }

  /**
   * Get lead time and cycle time metrics
   */
  @Get('boards/:boardId/analytics/lead-cycle')
  getLeadCycle(
    @Param('boardId') boardId: string,
    @Query('limit') limit?: string,
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 50;
    return this.analyticsService.getLeadCycleMetrics(boardId, numLimit);
  }

  /**
   * Get stale tasks
   */
  @Get('boards/:boardId/analytics/stale')
  getStaleTasks(
    @Param('boardId') boardId: string,
    @Query('days') days?: string,
  ) {
    const thresholdDays = days ? parseInt(days, 10) : 7;
    return this.analyticsService.getStaleTasks(boardId, thresholdDays);
  }

  /**
   * Get WIP breach status
   */
  @Get('boards/:boardId/analytics/wip-breaches')
  getWipBreaches(@Param('boardId') boardId: string) {
    return this.analyticsService.getWipBreaches(boardId);
  }
}
