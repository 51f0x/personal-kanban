import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get board summary statistics
   */
  @Get("boards/:boardId/analytics/summary")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get board summary",
    description: "Get summary statistics for a board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "Board summary statistics" })
  getSummary(@Param("boardId") boardId: string) {
    return this.analyticsService.getBoardSummary(boardId);
  }

  /**
   * Get Cumulative Flow Diagram data
   */
  @Get("boards/:boardId/analytics/cfd")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get Cumulative Flow Diagram",
    description: "Get CFD data for a board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiQuery({
    name: "days",
    required: false,
    description: "Number of days (default: 30)",
  })
  @ApiResponse({ status: 200, description: "CFD data" })
  getCFD(@Param("boardId") boardId: string, @Query("days") days?: string) {
    const numDays = days ? Number.parseInt(days, 10) : 30;
    return this.analyticsService.getCFDData(boardId, numDays);
  }

  /**
   * Get throughput data (completed tasks per period)
   */
  @Get("boards/:boardId/analytics/throughput")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get throughput",
    description: "Get throughput data (completed tasks per period)",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["day", "week"],
    description: "Period type (default: week)",
  })
  @ApiQuery({
    name: "periods",
    required: false,
    description: "Number of periods (default: 12)",
  })
  @ApiResponse({ status: 200, description: "Throughput data" })
  getThroughput(
    @Param("boardId") boardId: string,
    @Query("period") period?: "day" | "week",
    @Query("periods") periods?: string,
  ) {
    const numPeriods = periods ? Number.parseInt(periods, 10) : 12;
    return this.analyticsService.getThroughput(
      boardId,
      period ?? "week",
      numPeriods,
    );
  }

  /**
   * Get lead time and cycle time metrics
   */
  @Get("boards/:boardId/analytics/lead-cycle")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get lead and cycle time",
    description: "Get lead time and cycle time metrics",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Limit number of tasks (default: 50)",
  })
  @ApiResponse({ status: 200, description: "Lead and cycle time metrics" })
  getLeadCycle(
    @Param("boardId") boardId: string,
    @Query("limit") limit?: string,
  ) {
    const numLimit = limit ? Number.parseInt(limit, 10) : 50;
    return this.analyticsService.getLeadCycleMetrics(boardId, numLimit);
  }

  /**
   * Get stale tasks
   */
  @Get("boards/:boardId/analytics/stale")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get stale tasks",
    description:
      "Get tasks that have not been updated for a specified number of days",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiQuery({
    name: "days",
    required: false,
    description: "Number of days threshold (default: 7)",
  })
  @ApiResponse({ status: 200, description: "List of stale tasks" })
  getStaleTasks(
    @Param("boardId") boardId: string,
    @Query("days") days?: string,
  ) {
    const thresholdDays = days ? Number.parseInt(days, 10) : 7;
    return this.analyticsService.getStaleTasks(boardId, thresholdDays);
  }

  /**
   * Get WIP breach status
   */
  @Get("boards/:boardId/analytics/wip-breaches")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get WIP breaches",
    description: "Get work-in-progress limit breach status",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "WIP breach information" })
  getWipBreaches(@Param("boardId") boardId: string) {
    return this.analyticsService.getWipBreaches(boardId);
  }
}
