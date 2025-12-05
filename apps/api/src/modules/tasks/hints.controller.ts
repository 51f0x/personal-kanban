import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { HintsService } from './hints.service';
import { ApplyHintDto } from './dto/apply-hint.input';

@ApiTags('hints')
@Controller()
export class HintsController {
  constructor(private readonly hintsService: HintsService) {}

  @Get('tasks/:taskId/hints')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get hints for task', description: 'Get all hints for a specific task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'List of hints' })
  getHints(@Param('taskId') taskId: string) {
    return this.hintsService.getHintsForTask(taskId);
  }

  @Get('hints/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get hint', description: 'Get hint by ID' })
  @ApiParam({ name: 'id', description: 'Hint ID' })
  @ApiResponse({ status: 200, description: 'Hint information' })
  @ApiResponse({ status: 404, description: 'Hint not found' })
  getHint(@Param('id') id: string) {
    return this.hintsService.getHintById(id);
  }

  @Post('hints/:id/apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply hint', description: 'Apply a hint to a task' })
  @ApiParam({ name: 'id', description: 'Hint ID' })
  @ApiBody({ type: ApplyHintDto })
  @ApiResponse({ status: 200, description: 'Hint applied successfully' })
  @ApiResponse({ status: 404, description: 'Hint not found' })
  applyHint(@Param('id') id: string, @Body() dto: ApplyHintDto) {
    return this.hintsService.applyHint(id, dto);
  }

  @Patch('hints/:id/dismiss')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dismiss hint', description: 'Dismiss a hint' })
  @ApiParam({ name: 'id', description: 'Hint ID' })
  @ApiResponse({ status: 200, description: 'Hint dismissed successfully' })
  @ApiResponse({ status: 404, description: 'Hint not found' })
  dismissHint(@Param('id') id: string) {
    return this.hintsService.dismissHint(id);
  }

  @Delete('hints/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete hint', description: 'Delete a hint' })
  @ApiParam({ name: 'id', description: 'Hint ID' })
  @ApiResponse({ status: 200, description: 'Hint deleted successfully' })
  @ApiResponse({ status: 404, description: 'Hint not found' })
  deleteHint(@Param('id') id: string) {
    return this.hintsService.deleteHint(id);
  }
}

