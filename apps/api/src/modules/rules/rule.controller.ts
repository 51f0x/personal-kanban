import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { RuleService } from "./rule.service";
import { CreateRuleDto } from "./dto/create-rule.input";
import { UpdateRuleDto } from "./dto/update-rule.input";

@ApiTags("rules")
@Controller()
export class RuleController {
  constructor(private readonly ruleService: RuleService) {}

  @Get("rules/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get rule", description: "Get rule by ID" })
  @ApiParam({ name: "id", description: "Rule ID" })
  @ApiResponse({ status: 200, description: "Rule information" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  getRule(@Param("id") id: string) {
    return this.ruleService.getRule(id);
  }

  @Get("boards/:boardId/rules")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List rules for board",
    description: "Get all rules for a specific board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "List of rules" })
  listRules(@Param("boardId") boardId: string) {
    return this.ruleService.listRulesForBoard(boardId);
  }

  @Post("boards/:boardId/rules")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create rule",
    description: "Create a new rule for a board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiBody({
    type: CreateRuleDto,
    description: "Rule data (boardId is taken from URL parameter)",
  })
  @ApiResponse({ status: 201, description: "Rule created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  createRule(
    @Param("boardId") boardId: string,
    @Body() dto: Omit<CreateRuleDto, "boardId">,
  ) {
    return this.ruleService.createRule({ ...dto, boardId });
  }

  @Post("rules/validate")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Validate rule",
    description: "Validate a rule without creating it",
  })
  @ApiBody({ type: CreateRuleDto })
  @ApiResponse({ status: 200, description: "Rule validation result" })
  validateRule(@Body() dto: CreateRuleDto) {
    return this.ruleService.validateRule(dto);
  }

  @Patch("rules/:id")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update rule",
    description: "Update an existing rule",
  })
  @ApiParam({ name: "id", description: "Rule ID" })
  @ApiBody({ type: UpdateRuleDto })
  @ApiResponse({ status: 200, description: "Rule updated successfully" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  updateRule(@Param("id") id: string, @Body() dto: UpdateRuleDto) {
    return this.ruleService.updateRule(id, dto);
  }

  @Post("rules/:id/toggle")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Toggle rule",
    description: "Enable or disable a rule",
  })
  @ApiParam({ name: "id", description: "Rule ID" })
  @ApiResponse({ status: 200, description: "Rule toggled successfully" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  toggleRule(@Param("id") id: string) {
    return this.ruleService.toggleRule(id);
  }

  @Post("rules/:id/duplicate")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Duplicate rule",
    description: "Create a copy of an existing rule",
  })
  @ApiParam({ name: "id", description: "Rule ID" })
  @ApiQuery({
    name: "name",
    required: false,
    description: "Name for the duplicated rule",
  })
  @ApiResponse({ status: 200, description: "Rule duplicated successfully" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  duplicateRule(@Param("id") id: string, @Query("name") newName?: string) {
    return this.ruleService.duplicateRule(id, newName);
  }

  @Delete("rules/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete rule", description: "Delete a rule" })
  @ApiParam({ name: "id", description: "Rule ID" })
  @ApiResponse({ status: 200, description: "Rule deleted successfully" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  deleteRule(@Param("id") id: string) {
    return this.ruleService.deleteRule(id);
  }
}
