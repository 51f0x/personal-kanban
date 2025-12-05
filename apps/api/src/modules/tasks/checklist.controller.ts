import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ChecklistService } from './checklist.service';
import { CreateChecklistItemDto, UpdateChecklistItemDto, ReorderChecklistDto } from './dto/checklist.input';

@ApiTags('checklist')
@Controller()
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get('tasks/:taskId/checklist')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List checklist items', description: 'Get all checklist items for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'List of checklist items' })
  listItems(@Param('taskId') taskId: string) {
    return this.checklistService.listItemsForTask(taskId);
  }

  @Get('tasks/:taskId/checklist/progress')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get checklist progress', description: 'Get completion progress for a task checklist' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Checklist progress information' })
  getProgress(@Param('taskId') taskId: string) {
    return this.checklistService.getProgress(taskId);
  }

  @Post('tasks/:taskId/checklist')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create checklist item', description: 'Create a new checklist item for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiBody({ type: CreateChecklistItemDto })
  @ApiResponse({ status: 201, description: 'Checklist item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  createItem(@Param('taskId') taskId: string, @Body() dto: CreateChecklistItemDto) {
    return this.checklistService.createItem(taskId, dto);
  }

  @Get('checklist/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get checklist item', description: 'Get checklist item by ID' })
  @ApiParam({ name: 'id', description: 'Checklist item ID' })
  @ApiResponse({ status: 200, description: 'Checklist item information' })
  @ApiResponse({ status: 404, description: 'Checklist item not found' })
  getItem(@Param('id') id: string) {
    return this.checklistService.getItem(id);
  }

  @Patch('checklist/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update checklist item', description: 'Update an existing checklist item' })
  @ApiParam({ name: 'id', description: 'Checklist item ID' })
  @ApiBody({ type: UpdateChecklistItemDto })
  @ApiResponse({ status: 200, description: 'Checklist item updated successfully' })
  @ApiResponse({ status: 404, description: 'Checklist item not found' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateChecklistItemDto) {
    return this.checklistService.updateItem(id, dto);
  }

  @Post('checklist/:id/toggle')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle checklist item', description: 'Toggle the completion status of a checklist item' })
  @ApiParam({ name: 'id', description: 'Checklist item ID' })
  @ApiResponse({ status: 200, description: 'Checklist item toggled successfully' })
  @ApiResponse({ status: 404, description: 'Checklist item not found' })
  toggleItem(@Param('id') id: string) {
    return this.checklistService.toggleItem(id);
  }

  @Delete('checklist/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete checklist item', description: 'Delete a checklist item' })
  @ApiParam({ name: 'id', description: 'Checklist item ID' })
  @ApiResponse({ status: 200, description: 'Checklist item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Checklist item not found' })
  deleteItem(@Param('id') id: string) {
    return this.checklistService.deleteItem(id);
  }

  @Post('tasks/:taskId/checklist/reorder')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder checklist items', description: 'Reorder checklist items for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiBody({ type: ReorderChecklistDto })
  @ApiResponse({ status: 200, description: 'Checklist items reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  reorderItems(@Param('taskId') taskId: string, @Body() dto: ReorderChecklistDto) {
    return this.checklistService.reorderItems(taskId, dto);
  }
}
