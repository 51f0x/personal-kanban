import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.input';
import { UpdateTagDto } from './dto/update-tag.input';

@Controller()
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get('tags/:id')
  getTag(@Param('id') id: string) {
    return this.tagService.getTag(id);
  }

  @Get('boards/:boardId/tags')
  listTags(@Param('boardId') boardId: string) {
    return this.tagService.listTagsForBoard(boardId);
  }

  @Post('boards/:boardId/tags')
  createTag(@Param('boardId') boardId: string, @Body() dto: Omit<CreateTagDto, 'boardId'>) {
    return this.tagService.createTag({ ...dto, boardId });
  }

  @Patch('tags/:id')
  updateTag(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagService.updateTag(id, dto);
  }

  @Delete('tags/:id')
  deleteTag(@Param('id') id: string) {
    return this.tagService.deleteTag(id);
  }

  @Post('tasks/:taskId/tags/:tagId')
  addTagToTask(@Param('taskId') taskId: string, @Param('tagId') tagId: string) {
    return this.tagService.addTagToTask(taskId, tagId);
  }

  @Delete('tasks/:taskId/tags/:tagId')
  removeTagFromTask(@Param('taskId') taskId: string, @Param('tagId') tagId: string) {
    return this.tagService.removeTagFromTask(taskId, tagId);
  }
}
