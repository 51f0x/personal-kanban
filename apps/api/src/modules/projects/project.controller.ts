import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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

import { ProjectService } from "./project.service";
import type { CreateProjectInput } from "./dto/create-project.input";
import type { UpdateProjectInput } from "./dto/update-project.input";

@ApiTags("projects")
@Controller()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get("projects/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get project", description: "Get project by ID" })
  @ApiParam({ name: "id", description: "Project ID" })
  @ApiResponse({ status: 200, description: "Project information" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async getProject(@Param("id") id: string) {
    const project = await this.projectService.getProject(id);
    if (!project) {
      throw new NotFoundException(`Project not found: ${id}`);
    }
    return project;
  }

  @Get("boards/:boardId/projects")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List projects for board",
    description: "Get all projects for a specific board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "List of projects" })
  listProjects(@Param("boardId") boardId: string) {
    return this.projectService.listProjects(boardId);
  }

  @Post("boards/:boardId/projects")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create project",
    description: "Create a new project for a board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        ownerId: { type: "string" },
        name: { type: "string" },
        description: { type: "string", nullable: true },
        desiredOutcome: { type: "string", nullable: true },
      },
      required: ["ownerId", "name"],
    },
    description: "Project data (boardId is taken from URL parameter)",
  })
  @ApiResponse({ status: 201, description: "Project created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  createProject(
    @Param("boardId") boardId: string,
    @Body() dto: Omit<CreateProjectInput, "boardId">,
  ) {
    return this.projectService.createProject({ ...dto, boardId });
  }

  @Patch("projects/:id")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update project",
    description: "Update an existing project",
  })
  @ApiParam({ name: "id", description: "Project ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string", nullable: true },
        desiredOutcome: { type: "string", nullable: true },
        status: { type: "string", nullable: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Project updated successfully" })
  @ApiResponse({ status: 404, description: "Project not found" })
  updateProject(@Param("id") id: string, @Body() dto: Omit<UpdateProjectInput, "id">) {
    return this.projectService.updateProject({ id, ...dto });
  }

  @Delete("projects/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete project", description: "Delete a project" })
  @ApiParam({ name: "id", description: "Project ID" })
  @ApiResponse({ status: 200, description: "Project deleted successfully" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async deleteProject(@Param("id") id: string) {
    const project = await this.projectService.getProject(id);
    if (!project) {
      throw new NotFoundException(`Project not found: ${id}`);
    }
    await this.projectService.deleteProject(id);
    return { success: true, deletedId: id };
  }
}

