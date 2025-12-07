import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import { CreateChecklistItemDto, UpdateChecklistItemDto, ReorderChecklistDto } from './dto/checklist.input';

@Injectable()
export class ChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  async createItem(taskId: string, input: CreateChecklistItemDto) {
    // Verify task exists
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }

    // Get the max position if not specified
    let position = input.position;
    if (position === undefined) {
      const maxPosition = await this.prisma.checklistItem.aggregate({
        where: { taskId },
        _max: { position: true },
      });
      position = (maxPosition._max.position ?? -1) + 1;
    }

    return this.prisma.checklistItem.create({
      data: {
        taskId,
        title: input.title,
        isDone: input.isDone ?? false,
        position,
      },
    });
  }

  async getItem(id: string) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Checklist item not found: ${id}`);
    }
    return item;
  }

  async listItemsForTask(taskId: string) {
    return this.prisma.checklistItem.findMany({
      where: { taskId },
      orderBy: { position: 'asc' },
    });
  }

  async updateItem(id: string, input: UpdateChecklistItemDto) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Checklist item not found: ${id}`);
    }

    return this.prisma.checklistItem.update({
      where: { id },
      data: {
        title: input.title,
        isDone: input.isDone,
        position: input.position,
      },
    });
  }

  async toggleItem(id: string) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Checklist item not found: ${id}`);
    }

    return this.prisma.checklistItem.update({
      where: { id },
      data: { isDone: !item.isDone },
    });
  }

  async deleteItem(id: string) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Checklist item not found: ${id}`);
    }

    await this.prisma.checklistItem.delete({ where: { id } });

    // Re-order remaining items
    await this.prisma.$executeRaw`
      UPDATE "ChecklistItem"
      SET position = position - 1
      WHERE "taskId" = ${item.taskId}::uuid
      AND position > ${item.position}
    `;

    return { success: true, deletedId: id };
  }

  async reorderItems(taskId: string, input: ReorderChecklistDto) {
    // Verify all items belong to the task
    const items = await this.prisma.checklistItem.findMany({
      where: { taskId },
      select: { id: true },
    });

    const existingIds = new Set(items.map((i) => i.id));
    for (const id of input.itemIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Checklist item ${id} does not belong to task ${taskId}`);
      }
    }

    // Update positions in a transaction
    await this.prisma.$transaction(
      input.itemIds.map((itemId, index) =>
        this.prisma.checklistItem.update({
          where: { id: itemId },
          data: { position: index },
        }),
      ),
    );

    return this.listItemsForTask(taskId);
  }

  /**
   * Get checklist progress for a task
   */
  async getProgress(taskId: string) {
    const items = await this.prisma.checklistItem.findMany({
      where: { taskId },
      select: { isDone: true },
    });

    const total = items.length;
    const completed = items.filter((i) => i.isDone).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      taskId,
      total,
      completed,
      remaining: total - completed,
      percentage,
    };
  }
}
