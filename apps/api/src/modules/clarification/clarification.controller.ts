import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ClarificationService } from './clarification.service';
import { ClarifyTaskDto } from './dto/clarify-task.input';

@Controller()
export class ClarificationController {
  constructor(private readonly clarificationService: ClarificationService) {}

  /**
   * Get the next unclarified task from the Input column
   */
  @Get('boards/:boardId/clarify/next')
  getNextUnclarified(@Param('boardId') boardId: string) {
    return this.clarificationService.getNextUnclarified(boardId);
  }

  /**
   * Apply clarification decisions to a task
   */
  @Post('tasks/:taskId/clarify')
  clarifyTask(@Param('taskId') taskId: string, @Body() dto: ClarifyTaskDto) {
    return this.clarificationService.clarifyTask(taskId, dto);
  }

  /**
   * Get clarification statistics for a board
   */
  @Get('boards/:boardId/clarify/stats')
  getStats(@Param('boardId') boardId: string) {
    return this.clarificationService.getStats(boardId);
  }
}
