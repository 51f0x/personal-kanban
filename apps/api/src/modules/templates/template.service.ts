import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.input';
import { UpdateTemplateDto } from './dto/update-template.input';

// Simple RRULE parsing for next occurrence calculation
// In production, use the 'rrule' package for full RFC 5545 support
function parseSimpleRRule(rrule: string, timezone: string = 'UTC'): Date | null {
  try {
    // Handle basic RRULE patterns
    const parts = rrule.split(';').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const now = new Date();
    const nextDate = new Date(now);

    // Get frequency
    const freq = parts['FREQ'];
    
    switch (freq) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'WEEKLY':
        // Handle BYDAY
        const days = parts['BYDAY']?.split(',') ?? ['MO'];
        const dayMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
        const targetDays = days.map(d => dayMap[d]).filter(d => d !== undefined);
        
        const currentDay = now.getDay();
        let daysToAdd = 7;
        for (const targetDay of targetDays) {
          let diff = targetDay - currentDay;
          if (diff <= 0) diff += 7;
          if (diff < daysToAdd) daysToAdd = diff;
        }
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        break;
      case 'MONTHLY':
        const byMonthDay = parts['BYMONTHDAY'] ? parseInt(parts['BYMONTHDAY']) : 1;
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(byMonthDay);
        break;
      default:
        // Default to daily
        nextDate.setDate(nextDate.getDate() + 1);
    }

    // Handle BYHOUR
    if (parts['BYHOUR']) {
      nextDate.setHours(parseInt(parts['BYHOUR']), 0, 0, 0);
    }

    // Handle BYMINUTE
    if (parts['BYMINUTE']) {
      nextDate.setMinutes(parseInt(parts['BYMINUTE']));
    }

    return nextDate;
  } catch (error) {
    console.error('Failed to parse RRULE:', error);
    return null;
  }
}

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(input: CreateTemplateDto) {
    // Validate board exists
    const board = await this.prisma.board.findUnique({
      where: { id: input.boardId },
    });
    if (!board) {
      throw new NotFoundException(`Board not found: ${input.boardId}`);
    }

    // Validate owner exists
    const owner = await this.prisma.user.findUnique({
      where: { id: input.ownerId },
    });
    if (!owner) {
      throw new NotFoundException(`Owner not found: ${input.ownerId}`);
    }

    // Calculate next run time
    const nextRunAt = parseSimpleRRule(input.rrule, input.timezone ?? 'UTC');

    return this.prisma.recurringTemplate.create({
      data: {
        boardId: input.boardId,
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        payload: input.payload as unknown as Prisma.JsonObject,
        rrule: input.rrule,
        timezone: input.timezone ?? 'UTC',
        isActive: input.isActive ?? true,
        nextRunAt,
      },
    });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.recurringTemplate.findUnique({
      where: { id },
      include: {
        board: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    return template;
  }

  async listTemplatesForBoard(boardId: string) {
    return this.prisma.recurringTemplate.findMany({
      where: { boardId },
      orderBy: [{ isActive: 'desc' }, { nextRunAt: 'asc' }],
      include: {
        owner: { select: { id: true, name: true } },
      },
    });
  }

  async updateTemplate(id: string, input: UpdateTemplateDto) {
    const template = await this.prisma.recurringTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    // Recalculate next run time if rrule changed
    let nextRunAt = template.nextRunAt;
    if (input.rrule && input.rrule !== template.rrule) {
      nextRunAt = parseSimpleRRule(input.rrule, input.timezone ?? template.timezone);
    }

    return this.prisma.recurringTemplate.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        payload: input.payload
          ? (input.payload as unknown as Prisma.JsonObject)
          : undefined,
        rrule: input.rrule,
        timezone: input.timezone,
        isActive: input.isActive,
        nextRunAt,
      },
    });
  }

  async toggleTemplate(id: string) {
    const template = await this.prisma.recurringTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    return this.prisma.recurringTemplate.update({
      where: { id },
      data: { isActive: !template.isActive },
    });
  }

  async skipNextOccurrence(id: string) {
    const template = await this.prisma.recurringTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    // Calculate the next occurrence after the current one
    const nextRunAt = parseSimpleRRule(template.rrule, template.timezone);

    return this.prisma.recurringTemplate.update({
      where: { id },
      data: { nextRunAt },
    });
  }

  async runNow(id: string) {
    const template = await this.prisma.recurringTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    // Update last run and calculate next run
    const now = new Date();
    const nextRunAt = parseSimpleRRule(template.rrule, template.timezone);

    await this.prisma.recurringTemplate.update({
      where: { id },
      data: {
        lastRunAt: now,
        nextRunAt,
      },
    });

    // Return the payload so a worker can create the task
    return {
      templateId: id,
      boardId: template.boardId,
      ownerId: template.ownerId,
      payload: template.payload,
      executedAt: now.toISOString(),
    };
  }

  async deleteTemplate(id: string) {
    const template = await this.prisma.recurringTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    await this.prisma.recurringTemplate.delete({ where: { id } });
    return { success: true, deletedId: id };
  }

  /**
   * Get templates that are due to run
   */
  async getDueTemplates() {
    const now = new Date();
    return this.prisma.recurringTemplate.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: 'asc' },
    });
  }
}
