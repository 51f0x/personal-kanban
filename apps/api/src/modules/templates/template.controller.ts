import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/create-template.input';
import { UpdateTemplateDto } from './dto/update-template.input';

@Controller()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.templateService.getTemplate(id);
  }

  @Get('boards/:boardId/templates')
  listTemplates(@Param('boardId') boardId: string) {
    return this.templateService.listTemplatesForBoard(boardId);
  }

  @Post('boards/:boardId/templates')
  createTemplate(
    @Param('boardId') boardId: string,
    @Body() dto: Omit<CreateTemplateDto, 'boardId'>,
  ) {
    return this.templateService.createTemplate({ ...dto, boardId });
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.updateTemplate(id, dto);
  }

  @Post('templates/:id/toggle')
  toggleTemplate(@Param('id') id: string) {
    return this.templateService.toggleTemplate(id);
  }

  @Post('templates/:id/skip')
  skipNextOccurrence(@Param('id') id: string) {
    return this.templateService.skipNextOccurrence(id);
  }

  @Post('templates/:id/run')
  runNow(@Param('id') id: string) {
    return this.templateService.runNow(id);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.templateService.deleteTemplate(id);
  }
}
