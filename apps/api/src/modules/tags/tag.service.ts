import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import { CreateTagDto } from './dto/create-tag.input';
import { UpdateTagDto } from './dto/update-tag.input';

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  async createTag(input: CreateTagDto) {
    // Check for duplicate name in the same board
    const existing = await this.prisma.tag.findUnique({
      where: {
        boardId_name: {
          boardId: input.boardId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Tag "${input.name}" already exists on this board`);
    }

    return this.prisma.tag.create({
      data: {
        boardId: input.boardId,
        name: input.name,
        color: input.color ?? '#94a3b8',
      },
    });
  }

  async getTag(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag not found: ${id}`);
    }

    return tag;
  }

  async listTagsForBoard(boardId: string) {
    return this.prisma.tag.findMany({
      where: { boardId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });
  }

  async updateTag(id: string, input: UpdateTagDto) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag not found: ${id}`);
    }

    // Check for duplicate name if changing name
    if (input.name && input.name !== tag.name) {
      const existing = await this.prisma.tag.findUnique({
        where: {
          boardId_name: {
            boardId: tag.boardId,
            name: input.name,
          },
        },
      });

      if (existing) {
        throw new ConflictException(`Tag "${input.name}" already exists on this board`);
      }
    }

    return this.prisma.tag.update({
      where: { id },
      data: {
        name: input.name,
        color: input.color,
      },
    });
  }

  async deleteTag(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { tasks: true } } },
    });

    if (!tag) {
      throw new NotFoundException(`Tag not found: ${id}`);
    }

    // Note: TaskTag records will be deleted via cascade
    await this.prisma.tag.delete({ where: { id } });

    return { success: true, deletedId: id, removedFromTasks: tag._count.tasks };
  }

  /**
   * Add a tag to a task
   */
  async addTagToTask(taskId: string, tagId: string) {
    // Verify both task and tag exist and belong to the same board
    const [task, tag] = await Promise.all([
      this.prisma.task.findUnique({ where: { id: taskId }, select: { boardId: true } }),
      this.prisma.tag.findUnique({ where: { id: tagId }, select: { boardId: true } }),
    ]);

    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }
    if (!tag) {
      throw new NotFoundException(`Tag not found: ${tagId}`);
    }
    if (task.boardId !== tag.boardId) {
      throw new ConflictException('Task and tag must belong to the same board');
    }

    // Create the relationship (upsert to handle duplicates)
    await this.prisma.taskTag.upsert({
      where: { taskId_tagId: { taskId, tagId } },
      update: {},
      create: { taskId, tagId },
    });

    return { success: true };
  }

  /**
   * Remove a tag from a task
   */
  async removeTagFromTask(taskId: string, tagId: string) {
    await this.prisma.taskTag.deleteMany({
      where: { taskId, tagId },
    });

    return { success: true };
  }
}
