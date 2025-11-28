import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ColumnService } from './column.service';
import { CreateColumnDto } from './dto/create-column.input';
import { UpdateColumnDto, ReorderColumnsDto } from './dto/update-column.input';
import { WipService } from './wip.service';

@Controller()
export class ColumnController {
  constructor(
    private readonly columnService: ColumnService,
    private readonly wipService: WipService,
  ) {}

  @Get('columns/:id')
  getColumn(@Param('id') id: string) {
    return this.columnService.getColumn(id);
  }

  @Get('boards/:boardId/columns')
  listColumns(@Param('boardId') boardId: string) {
    return this.columnService.listColumnsForBoard(boardId);
  }

  @Get('boards/:boardId/wip-status')
  getBoardWipStatus(@Param('boardId') boardId: string) {
    return this.wipService.getBoardWipStatus(boardId);
  }

  @Post('boards/:boardId/columns')
  createColumn(@Param('boardId') boardId: string, @Body() dto: Omit<CreateColumnDto, 'boardId'>) {
    return this.columnService.createColumn({ ...dto, boardId });
  }

  @Patch('columns/:id')
  updateColumn(@Param('id') id: string, @Body() dto: UpdateColumnDto) {
    return this.columnService.updateColumn(id, dto);
  }

  @Delete('columns/:id')
  deleteColumn(@Param('id') id: string) {
    return this.columnService.deleteColumn(id);
  }

  @Post('boards/:boardId/columns/reorder')
  reorderColumns(@Param('boardId') boardId: string, @Body() dto: ReorderColumnsDto) {
    return this.columnService.reorderColumns(boardId, dto);
  }
}
