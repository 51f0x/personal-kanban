import type { Prisma } from "@prisma/client";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@personal-kanban/shared";

import type { CreateRuleDto } from "./dto/create-rule.input";
import type { UpdateRuleDto } from "./dto/update-rule.input";

@Injectable()
export class RuleService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(input: CreateRuleDto) {
    // Validate that board exists
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

    return this.prisma.rule.create({
      data: {
        boardId: input.boardId,
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        enabled: input.enabled ?? true,
        priority: input.priority ?? 100,
        trigger: input.trigger as unknown as Prisma.JsonObject,
        conditions: (input.conditions ?? []) as unknown as Prisma.JsonArray,
        actions: input.actions as unknown as Prisma.JsonArray,
      },
    });
  }

  async getRule(id: string) {
    const rule = await this.prisma.rule.findUnique({
      where: { id },
      include: {
        board: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!rule) {
      throw new NotFoundException(`Rule not found: ${id}`);
    }

    return rule;
  }

  async listRulesForBoard(boardId: string) {
    return this.prisma.rule.findMany({
      where: { boardId },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: {
        owner: { select: { id: true, name: true } },
      },
    });
  }

  async updateRule(id: string, input: UpdateRuleDto) {
    const rule = await this.prisma.rule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Rule not found: ${id}`);
    }

    return this.prisma.rule.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        enabled: input.enabled,
        priority: input.priority,
        trigger: input.trigger
          ? (input.trigger as unknown as Prisma.JsonObject)
          : undefined,
        conditions: input.conditions
          ? (input.conditions as unknown as Prisma.JsonArray)
          : undefined,
        actions: input.actions
          ? (input.actions as unknown as Prisma.JsonArray)
          : undefined,
      },
    });
  }

  async toggleRule(id: string) {
    const rule = await this.prisma.rule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Rule not found: ${id}`);
    }

    return this.prisma.rule.update({
      where: { id },
      data: { enabled: !rule.enabled },
    });
  }

  async deleteRule(id: string) {
    const rule = await this.prisma.rule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Rule not found: ${id}`);
    }

    await this.prisma.rule.delete({ where: { id } });
    return { success: true, deletedId: id };
  }

  /**
   * Get rules that match a specific trigger type
   */
  async getRulesByTrigger(boardId: string, triggerType: string) {
    const rules = await this.prisma.rule.findMany({
      where: {
        boardId,
        enabled: true,
      },
      orderBy: [{ priority: "asc" }],
    });

    // Filter by trigger type (JSON field)
    return rules.filter((rule) => {
      const trigger = rule.trigger as { type?: string };
      return trigger?.type === triggerType;
    });
  }

  /**
   * Duplicate a rule
   */
  async duplicateRule(id: string, newName?: string) {
    const rule = await this.prisma.rule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Rule not found: ${id}`);
    }

    return this.prisma.rule.create({
      data: {
        boardId: rule.boardId,
        ownerId: rule.ownerId,
        name: newName ?? `${rule.name} (copy)`,
        description: rule.description,
        enabled: false, // Start disabled
        priority: rule.priority,
        trigger: rule.trigger as Prisma.JsonObject,
        conditions: rule.conditions as Prisma.JsonArray,
        actions: rule.actions as Prisma.JsonArray,
      },
    });
  }

  /**
   * Validate rule configuration
   */
  validateRule(input: CreateRuleDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate trigger
    const validTriggerTypes = [
      "task.created",
      "task.moved",
      "task.completed",
      "stale",
      "schedule",
      "email.received",
    ];
    if (!validTriggerTypes.includes(input.trigger.type)) {
      errors.push(`Invalid trigger type: ${input.trigger.type}`);
    }

    // Validate schedule trigger has schedule config
    if (input.trigger.type === "schedule" && !input.trigger.config?.schedule) {
      errors.push("Schedule trigger requires a schedule config");
    }

    // Validate actions
    const validActionTypes = [
      "createTask",
      "updateTask",
      "moveTask",
      "addTag",
      "removeTag",
      "addChecklist",
      "notify",
      "stop",
    ];
    for (const action of input.actions) {
      if (!validActionTypes.includes(action.type)) {
        errors.push(`Invalid action type: ${action.type}`);
      }
    }

    // Validate conditions
    const validOperators = [
      "eq",
      "ne",
      "contains",
      "in",
      "notIn",
      "gt",
      "lt",
      "gte",
      "lte",
      "between",
      "exists",
      "notExists",
    ];
    for (const condition of input.conditions ?? []) {
      if (!validOperators.includes(condition.operator)) {
        errors.push(`Invalid operator: ${condition.operator}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
