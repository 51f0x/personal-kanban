import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.input';
import { UpdateTagDto } from './dto/update-tag.input';

@ApiTags('tags')
@Controller()
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get('tags/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tag', description: 'Get tag by ID' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag information' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  getTag(@Param('id') id: string) {
    return this.tagService.getTag(id);
  }

  @Get('boards/:boardId/tags')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tags for board', description: 'Get all tags for a specific board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'List of tags' })
  listTags(@Param('boardId') boardId: string) {
    return this.tagService.listTagsForBoard(boardId);
  }

  @Post('boards/:boardId/tags')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create tag', description: 'Create a new tag for a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiBody({ type: CreateTagDto, description: 'Tag data (boardId is taken from URL parameter)' })
  @ApiResponse({ status: 201, description: 'Tag created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  createTag(@Param('boardId') boardId: string, @Body() dto: Omit<CreateTagDto, 'boardId'>) {
    return this.tagService.createTag({ ...dto, boardId });
  }

  @Patch('tags/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tag', description: 'Update an existing tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({ status: 200, description: 'Tag updated successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  updateTag(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagService.updateTag(id, dto);
  }

  @Delete('tags/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete tag', description: 'Delete a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  deleteTag(@Param('id') id: string) {
    return this.tagService.deleteTag(id);
  }

  @Post('tasks/:taskId/tags/:tagId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add tag to task', description: 'Associate a tag with a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'tagId', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag added to task successfully' })
  @ApiResponse({ status: 404, description: 'Task or tag not found' })
  addTagToTask(@Param('taskId') taskId: string, @Param('tagId') tagId: string) {
    return this.tagService.addTagToTask(taskId, tagId);
  }

  @Delete('tasks/:taskId/tags/:tagId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove tag from task', description: 'Remove a tag association from a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'tagId', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag removed from task successfully' })
  @ApiResponse({ status: 404, description: 'Task or tag not found' })
  removeTagFromTask(@Param('taskId') taskId: string, @Param('tagId') tagId: string) {
    return this.tagService.removeTagFromTask(taskId, tagId);
  }
}
