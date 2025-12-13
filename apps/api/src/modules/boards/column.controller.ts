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

import { ColumnService } from "./column.service";
import { WipService } from "./wip.service";
import { CreateColumnDto } from "./dto/create-column.input";
import { ReorderColumnsDto, UpdateColumnDto } from "./dto/update-column.input";

@ApiTags("boards")
@Controller()
export class ColumnController {
  constructor(
    private readonly columnService: ColumnService,
    private readonly wipService: WipService,
  ) {}

  @Get("columns/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get column", description: "Get column by ID" })
  @ApiParam({ name: "id", description: "Column ID" })
  @ApiResponse({ status: 200, description: "Column information" })
  @ApiResponse({ status: 404, description: "Column not found" })
  getColumn(@Param("id") id: string) {
    return this.columnService.getColumn(id);
  }

  @Get("boards/:boardId/columns")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List columns for board",
    description: "Get all columns for a specific board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "List of columns" })
  listColumns(@Param("boardId") boardId: string) {
    return this.columnService.listColumnsForBoard(boardId);
  }

  @Get("boards/:boardId/wip-status")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get WIP status",
    description: "Get work-in-progress status for a board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "WIP status information" })
  getBoardWipStatus(@Param("boardId") boardId: string) {
    return this.wipService.getBoardWipStatus(boardId);
  }

  @Post("boards/:boardId/columns")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create column",
    description: "Create a new column for a board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiBody({
    type: CreateColumnDto,
    description: "Column data (boardId is taken from URL parameter)",
  })
  @ApiResponse({ status: 201, description: "Column created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  createColumn(
    @Param("boardId") boardId: string,
    @Body() dto: Omit<CreateColumnDto, "boardId">,
  ) {
    return this.columnService.createColumn({ ...dto, boardId });
  }

  @Patch("columns/:id")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update column",
    description: "Update an existing column",
  })
  @ApiParam({ name: "id", description: "Column ID" })
  @ApiBody({ type: UpdateColumnDto })
  @ApiResponse({ status: 200, description: "Column updated successfully" })
  @ApiResponse({ status: 404, description: "Column not found" })
  updateColumn(@Param("id") id: string, @Body() dto: UpdateColumnDto) {
    return this.columnService.updateColumn(id, dto);
  }

  @Delete("columns/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete column", description: "Delete a column" })
  @ApiParam({ name: "id", description: "Column ID" })
  @ApiResponse({ status: 200, description: "Column deleted successfully" })
  @ApiResponse({ status: 404, description: "Column not found" })
  deleteColumn(@Param("id") id: string) {
    return this.columnService.deleteColumn(id);
  }

  @Post("boards/:boardId/columns/reorder")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Reorder columns",
    description: "Reorder columns for a board",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiBody({ type: ReorderColumnsDto })
  @ApiResponse({ status: 200, description: "Columns reordered successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  reorderColumns(
    @Param("boardId") boardId: string,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.columnService.reorderColumns(boardId, dto);
  }
}
