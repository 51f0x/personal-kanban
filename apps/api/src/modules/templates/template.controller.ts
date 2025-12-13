import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { TemplateService } from "./template.service";
import { CreateTemplateDto } from "./dto/create-template.input";
import { UpdateTemplateDto } from "./dto/update-template.input";

@ApiTags("templates")
@Controller()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get("templates/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get template", description: "Get template by ID" })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({ status: 200, description: "Template information" })
  @ApiResponse({ status: 404, description: "Template not found" })
  getTemplate(@Param("id") id: string) {
    return this.templateService.getTemplate(id);
  }

  @Get("boards/:boardId/templates")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List templates for board",
    description: "Get all templates for a specific board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "List of templates" })
  listTemplates(@Param("boardId") boardId: string) {
    return this.templateService.listTemplatesForBoard(boardId);
  }

  @Post("boards/:boardId/templates")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create template",
    description: "Create a new template for a board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiBody({
    type: CreateTemplateDto,
    description: "Template data (boardId is taken from URL parameter)",
  })
  @ApiResponse({ status: 201, description: "Template created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  createTemplate(
    @Param("boardId") boardId: string,
    @Body() dto: Omit<CreateTemplateDto, "boardId">,
  ) {
    return this.templateService.createTemplate({ ...dto, boardId });
  }

  @Patch("templates/:id")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update template",
    description: "Update an existing template",
  })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiResponse({ status: 200, description: "Template updated successfully" })
  @ApiResponse({ status: 404, description: "Template not found" })
  updateTemplate(@Param("id") id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.updateTemplate(id, dto);
  }

  @Post("templates/:id/toggle")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Toggle template",
    description: "Enable or disable a template",
  })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({ status: 200, description: "Template toggled successfully" })
  @ApiResponse({ status: 404, description: "Template not found" })
  toggleTemplate(@Param("id") id: string) {
    return this.templateService.toggleTemplate(id);
  }

  @Post("templates/:id/skip")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Skip next occurrence",
    description: "Skip the next scheduled occurrence of a template",
  })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({
    status: 200,
    description: "Next occurrence skipped successfully",
  })
  @ApiResponse({ status: 404, description: "Template not found" })
  skipNextOccurrence(@Param("id") id: string) {
    return this.templateService.skipNextOccurrence(id);
  }

  @Post("templates/:id/run")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Run template now",
    description: "Execute a template immediately",
  })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({ status: 200, description: "Template executed successfully" })
  @ApiResponse({ status: 404, description: "Template not found" })
  runNow(@Param("id") id: string) {
    return this.templateService.runNow(id);
  }

  @Delete("templates/:id")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete template",
    description: "Delete a template",
  })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({ status: 200, description: "Template deleted successfully" })
  @ApiResponse({ status: 404, description: "Template not found" })
  deleteTemplate(@Param("id") id: string) {
    return this.templateService.deleteTemplate(id);
  }
}
