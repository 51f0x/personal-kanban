import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.input';
import { UpdateBoardDto } from './dto/update-board.input';
import {
    CreateBoardUseCase,
    UpdateBoardUseCase,
    DeleteBoardUseCase,
} from './application/use-cases';

@ApiTags('boards')
@Controller('boards')
export class BoardController {
  constructor(
    private readonly boardService: BoardService, // Keep for query methods
    private readonly createBoardUseCase: CreateBoardUseCase,
    private readonly updateBoardUseCase: UpdateBoardUseCase,
    private readonly deleteBoardUseCase: DeleteBoardUseCase,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List boards', description: 'Get all boards for an owner' })
  @ApiQuery({ name: 'ownerId', required: true, description: 'Owner user ID' })
  @ApiResponse({ status: 200, description: 'List of boards' })
  @ApiResponse({ status: 400, description: 'ownerId query parameter is required' })
  listBoards(@Query('ownerId') ownerId?: string) {
    if (!ownerId) {
      throw new BadRequestException('ownerId query parameter is required');
    }
    return this.boardService.listBoardsForOwner(ownerId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get board', description: 'Get board by ID' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board information' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async getBoard(@Param('id') id: string) {
    const board = await this.boardService.getBoardById(id);
    if (!board) {
      throw new NotFoundException(`Board not found: ${id}`);
    }
    return board;
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create board', description: 'Create a new board' })
  @ApiBody({ type: CreateBoardDto })
  @ApiResponse({ status: 201, description: 'Board created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  createBoard(@Body() dto: CreateBoardDto) {
    return this.createBoardUseCase.execute(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update board', description: 'Update an existing board' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiBody({ type: UpdateBoardDto })
  @ApiResponse({ status: 200, description: 'Board updated successfully' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  updateBoard(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.updateBoardUseCase.execute(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete board', description: 'Delete a board and all its associated data' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board deleted successfully' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  deleteBoard(@Param('id') id: string) {
    return this.deleteBoardUseCase.execute(id);
  }
}
