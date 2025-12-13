import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { ClarificationService } from "./clarification.service";
import { ClarifyTaskDto } from "./dto/clarify-task.input";

@ApiTags("clarification")
@Controller()
export class ClarificationController {
  constructor(private readonly clarificationService: ClarificationService) {}

  /**
   * Get the next unclarified task from the Input column
   */
  @Get("boards/:boardId/clarify/next")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get next unclarified task",
    description: "Get the next unclarified task from the Input column",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "Next unclarified task" })
  @ApiResponse({ status: 404, description: "No unclarified tasks found" })
  getNextUnclarified(@Param("boardId") boardId: string) {
    return this.clarificationService.getNextUnclarified(boardId);
  }

  /**
   * Apply clarification decisions to a task
   */
  @Post("tasks/:taskId/clarify")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Clarify task",
    description: "Apply clarification decisions to a task",
  })
  @ApiParam({ name: "taskId", description: "Task ID" })
  @ApiBody({ type: ClarifyTaskDto })
  @ApiResponse({ status: 200, description: "Task clarified successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 404, description: "Task not found" })
  clarifyTask(@Param("taskId") taskId: string, @Body() dto: ClarifyTaskDto) {
    return this.clarificationService.clarifyTask(taskId, dto);
  }

  /**
   * Get clarification statistics for a board
   */
  @Get("boards/:boardId/clarify/stats")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get clarification statistics",
    description: "Get clarification statistics for a board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "Clarification statistics" })
  getStats(@Param("boardId") boardId: string) {
    return this.clarificationService.getStats(boardId);
  }
}
