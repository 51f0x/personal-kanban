import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TaskService } from '../tasks/task.service';
import { CaptureRequestDto } from './dto/capture-request.dto';
import { parseCaptureText } from '@personal-kanban/shared';

@Injectable()
export class CaptureService {
  constructor(private readonly prisma: PrismaService, private readonly taskService: TaskService) {}

  async quickAdd(dto: CaptureRequestDto) {
    const board = await this.prisma.board.findUnique({
      where: { id: dto.boardId },
      include: { columns: { orderBy: { position: 'asc' } } },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const targetColumn = dto.columnId
      ? board.columns.find((col) => col.id === dto.columnId)
      : board.columns.find((col) => col.type === 'INPUT') ?? board.columns[0];

    if (!targetColumn) {
      throw new NotFoundException('Target column not found');
    }

    const parsed = parseCaptureText(dto.text);

    const task = await this.taskService.createTask({
      boardId: board.id,
      columnId: targetColumn.id,
      ownerId: dto.ownerId,
      title: parsed.title,
      description: parsed.description,
      metadata: {
        ...parsed.metadata,
        source: dto.source,
        extra: dto.metadata ?? undefined,
      },
      needsBreakdown: true,
    });

    return task;
  }
}
