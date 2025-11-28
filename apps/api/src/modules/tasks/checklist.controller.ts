import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { CreateChecklistItemDto, UpdateChecklistItemDto, ReorderChecklistDto } from './dto/checklist.input';

@Controller()
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get('tasks/:taskId/checklist')
  listItems(@Param('taskId') taskId: string) {
    return this.checklistService.listItemsForTask(taskId);
  }

  @Get('tasks/:taskId/checklist/progress')
  getProgress(@Param('taskId') taskId: string) {
    return this.checklistService.getProgress(taskId);
  }

  @Post('tasks/:taskId/checklist')
  createItem(@Param('taskId') taskId: string, @Body() dto: CreateChecklistItemDto) {
    return this.checklistService.createItem(taskId, dto);
  }

  @Get('checklist/:id')
  getItem(@Param('id') id: string) {
    return this.checklistService.getItem(id);
  }

  @Patch('checklist/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateChecklistItemDto) {
    return this.checklistService.updateItem(id, dto);
  }

  @Post('checklist/:id/toggle')
  toggleItem(@Param('id') id: string) {
    return this.checklistService.toggleItem(id);
  }

  @Delete('checklist/:id')
  deleteItem(@Param('id') id: string) {
    return this.checklistService.deleteItem(id);
  }

  @Post('tasks/:taskId/checklist/reorder')
  reorderItems(@Param('taskId') taskId: string, @Body() dto: ReorderChecklistDto) {
    return this.checklistService.reorderItems(taskId, dto);
  }
}
