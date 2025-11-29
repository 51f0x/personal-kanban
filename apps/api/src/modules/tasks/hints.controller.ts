import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { HintsService } from './hints.service';
import { ApplyHintDto } from './dto/apply-hint.input';

@Controller()
export class HintsController {
  constructor(private readonly hintsService: HintsService) {}

  @Get('tasks/:taskId/hints')
  getHints(@Param('taskId') taskId: string) {
    return this.hintsService.getHintsForTask(taskId);
  }

  @Get('hints/:id')
  getHint(@Param('id') id: string) {
    return this.hintsService.getHintById(id);
  }

  @Post('hints/:id/apply')
  applyHint(@Param('id') id: string, @Body() dto: ApplyHintDto) {
    return this.hintsService.applyHint(id, dto);
  }

  @Patch('hints/:id/dismiss')
  dismissHint(@Param('id') id: string) {
    return this.hintsService.dismissHint(id);
  }

  @Delete('hints/:id')
  deleteHint(@Param('id') id: string) {
    return this.hintsService.deleteHint(id);
  }
}

