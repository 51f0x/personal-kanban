import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.input';
import { UpdateBoardDto } from './dto/update-board.input';

@Controller('boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  listBoards(@Query('ownerId') ownerId?: string) {
    if (!ownerId) {
      throw new BadRequestException('ownerId query parameter is required');
    }
    return this.boardService.listBoardsForOwner(ownerId);
  }

  @Get(':id')
  getBoard(@Param('id') id: string) {
    return this.boardService.getBoardById(id);
  }

  @Post()
  createBoard(@Body() dto: CreateBoardDto) {
    return this.boardService.createBoard(dto);
  }

  @Patch(':id')
  updateBoard(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boardService.updateBoard(id, dto);
  }
}
