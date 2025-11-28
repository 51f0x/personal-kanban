import { Injectable } from '@nestjs/common';
import { Prisma, TaskEventType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BoardGateway } from '../realtime/board.gateway';
import { CreateTaskDto } from './dto/create-task.input';
import { UpdateTaskDto } from './dto/update-task.input';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService, private readonly boardGateway: BoardGateway) {}

  async createTask(input: CreateTaskDto) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          boardId: input.boardId,
          columnId: input.columnId,
          ownerId: input.ownerId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          context: input.context,
          waitingFor: input.waitingFor,
          dueAt: input.dueAt,
          needsBreakdown: input.needsBreakdown ?? false,
          metadata: input.metadata ?? Prisma.JsonNull,
        },
      });

      if (input.tags?.length) {
        await tx.taskTag.createMany({
          data: input.tags.map((tagId) => ({ taskId: task.id, tagId })),
          skipDuplicates: true,
        });
      }

      if (input.checklist?.length) {
        await tx.checklistItem.createMany({
          data: input.checklist.map((item, index) => ({
            taskId: task.id,
            title: item.title,
            isDone: item.isDone ?? false,
            position: item.position ?? index,
          })),
        });
      }

      await tx.taskEvent.create({
        data: {
          taskId: task.id,
          boardId: task.boardId,
          type: TaskEventType.CREATED,
          toColumnId: task.columnId,
        },
      });

      this.boardGateway.emitBoardUpdate(task.boardId, { type: 'task.created', taskId: task.id });
      return task;
    });
  }

  async updateTask(id: string, input: UpdateTaskDto) {
    const { tags, ...data } = input;
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data,
      });

      if (tags) {
        await tx.taskTag.deleteMany({ where: { taskId: id } });
        if (tags.length) {
          await tx.taskTag.createMany({
            data: tags.map((tagId) => ({ taskId: id, tagId })),
            skipDuplicates: true,
          });
        }
      }

      await tx.taskEvent.create({
        data: {
          taskId: id,
          boardId: task.boardId,
          type: TaskEventType.UPDATED,
        },
      });

      this.boardGateway.emitBoardUpdate(task.boardId, { type: 'task.updated', taskId: task.id });
      return task;
    });
  }

  getTaskById(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        checklist: { orderBy: { position: 'asc' } },
        tags: { include: { tag: true } },
      },
    });
  }

  listTasksForBoard(boardId: string) {
    return this.prisma.task.findMany({
      where: { boardId },
      include: {
        column: true,
        project: true,
        tags: { include: { tag: true } },
      },
      orderBy: [{ lastMovedAt: 'asc' }],
    });
  }
}
