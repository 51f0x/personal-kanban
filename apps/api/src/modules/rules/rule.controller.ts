import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RuleService } from './rule.service';
import { CreateRuleDto } from './dto/create-rule.input';
import { UpdateRuleDto } from './dto/update-rule.input';

@Controller()
export class RuleController {
  constructor(private readonly ruleService: RuleService) {}

  @Get('rules/:id')
  getRule(@Param('id') id: string) {
    return this.ruleService.getRule(id);
  }

  @Get('boards/:boardId/rules')
  listRules(@Param('boardId') boardId: string) {
    return this.ruleService.listRulesForBoard(boardId);
  }

  @Post('boards/:boardId/rules')
  createRule(
    @Param('boardId') boardId: string,
    @Body() dto: Omit<CreateRuleDto, 'boardId'>,
  ) {
    return this.ruleService.createRule({ ...dto, boardId });
  }

  @Post('rules/validate')
  validateRule(@Body() dto: CreateRuleDto) {
    return this.ruleService.validateRule(dto);
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.ruleService.updateRule(id, dto);
  }

  @Post('rules/:id/toggle')
  toggleRule(@Param('id') id: string) {
    return this.ruleService.toggleRule(id);
  }

  @Post('rules/:id/duplicate')
  duplicateRule(@Param('id') id: string, @Query('name') newName?: string) {
    return this.ruleService.duplicateRule(id, newName);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.ruleService.deleteRule(id);
  }
}
