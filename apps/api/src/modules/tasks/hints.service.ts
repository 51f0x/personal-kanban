import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@personal-kanban/shared";

import { BoardGateway } from "../realtime/board.gateway";
import { TagService } from "../tags/tag.service";
import { ApplyHintDto } from "./dto/apply-hint.input";
import { TaskService } from "./task.service";

@Injectable()
export class HintsService {
  private readonly logger = new Logger(HintsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskService: TaskService,
    private readonly tagService: TagService,
    private readonly boardGateway: BoardGateway,
  ) {}

  /**
   * Get all hints for a task
   */
  async getHintsForTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }

    return this.prisma.hint.findMany({
      where: { taskId },
      orderBy: [
        { applied: "asc" }, // Unapplied hints first
        { confidence: "desc" }, // Higher confidence first
        { createdAt: "desc" }, // Newer first
      ],
    });
  }

  /**
   * Get a specific hint by ID
   */
  async getHintById(id: string) {
    const hint = await this.prisma.hint.findUnique({
      where: { id },
      include: { task: { select: { id: true, boardId: true } } },
    });

    if (!hint) {
      throw new NotFoundException(`Hint not found: ${id}`);
    }

    return hint;
  }

  /**
   * Compare two hints to determine which is better
   * Returns true if hintA is better than hintB
   * Uses the same logic as worker's selectBestHints method
   */
  private isHintBetter(
    hintA: { agentId: string; confidence: number | null },
    hintB: { agentId: string; confidence: number | null },
  ): boolean {
    // Agent priority for description hints (higher = better)
    // task-assistant is the most comprehensive, so it takes priority
    const agentPriority: Record<string, number> = {
      "task-assistant-agent": 3,
      "task-analyzer-agent": 2,
      "content-summarizer-agent": 1,
      "task-help-agent": 1,
    };

    const confidenceA = hintA.confidence ?? 0;
    const confidenceB = hintB.confidence ?? 0;

    // First compare by confidence
    if (confidenceA !== confidenceB) {
      return confidenceA > confidenceB;
    }

    // If confidence is equal, compare by agent priority
    const priorityA = agentPriority[hintA.agentId] ?? 0;
    const priorityB = agentPriority[hintB.agentId] ?? 0;
    return priorityA > priorityB;
  }

  /**
   * Apply a hint - apply the hint's suggestion to the task
   * Prevents overriding better content by checking existing applied hints
   */
  async applyHint(id: string, _dto: ApplyHintDto) {
    const hint = await this.prisma.hint.findUnique({
      where: { id },
      include: { task: true },
    });

    if (!hint) {
      throw new NotFoundException(`Hint not found: ${id}`);
    }

    if (hint.applied) {
      return { message: "Hint already applied", hint };
    }

    // For description hints, check if there's already a better applied hint
    if (hint.hintType === "description") {
      const existingAppliedDescriptionHints = await this.prisma.hint.findMany({
        where: {
          taskId: hint.taskId,
          hintType: "description",
          applied: true,
        },
      });

      // Check if any existing applied hint is better than the one we're trying to apply
      for (const existingHint of existingAppliedDescriptionHints) {
        if (
          this.isHintBetter(
            {
              agentId: existingHint.agentId,
              confidence: existingHint.confidence,
            },
            {
              agentId: hint.agentId,
              confidence: hint.confidence,
            },
          )
        ) {
          this.logger.warn(
            `Not applying hint ${id}: existing applied hint ${existingHint.id} is better (confidence: ${existingHint.confidence}, agent: ${existingHint.agentId})`,
          );
          return {
            message:
              "A better description hint is already applied. Please dismiss the existing hint first if you want to apply this one.",
            hint,
          };
        }
      }
    }

    // Apply the hint based on its type
    await this.prisma.$transaction(async (tx) => {
      // Mark hint as applied
      await tx.hint.update({
        where: { id },
        data: { applied: true },
      });

      // Apply hint content to task based on hint type
      const updates: Record<string, unknown> = {};

      switch (hint.hintType) {
        case "title":
          if (hint.content) {
            updates.title = hint.content;
          }
          break;

        case "description":
          if (hint.content) {
            // Description hints replace the description (not append)
            // This ensures the best description hint is used, not concatenated
            // Matching the behavior of the worker's applyHintToTask method
            updates.description = hint.content;
          }
          break;

        case "context":
          if (hint.content) {
            updates.context = hint.content;
          }
          break;

        case "tags":
          if (
            hint.data &&
            typeof hint.data === "object" &&
            "tags" in hint.data
          ) {
            const tagNames = (hint.data as { tags?: string[] }).tags || [];
            // Find or create tags and link them to the task
            if (tagNames.length > 0) {
              const tagIds: string[] = [];

              for (const tagName of tagNames) {
                // Try to find existing tag by name
                const existingTag = await tx.tag.findFirst({
                  where: {
                    boardId: hint.task.boardId,
                    name: { equals: tagName, mode: "insensitive" },
                  },
                });

                let tagId: string;
                if (existingTag) {
                  tagId = existingTag.id;
                } else {
                  // Create new tag
                  const newTag = await tx.tag.create({
                    data: {
                      boardId: hint.task.boardId,
                      name: tagName,
                      color: "#94a3b8",
                    },
                  });
                  tagId = newTag.id;
                }

                tagIds.push(tagId);
              }

              // Link all tags to the task
              for (const tagId of tagIds) {
                await tx.taskTag.upsert({
                  where: {
                    taskId_tagId: {
                      taskId: hint.taskId,
                      tagId,
                    },
                  },
                  update: {},
                  create: {
                    taskId: hint.taskId,
                    tagId,
                  },
                });
              }
            }
          }
          break;

        case "actions":
          if (
            hint.data &&
            typeof hint.data === "object" &&
            "actions" in hint.data
          ) {
            const actions =
              (hint.data as { actions?: Array<{ description: string }> })
                .actions || [];
            // Add checklist items for actions
            if (actions.length > 0) {
              const existingCount = await tx.checklistItem.count({
                where: { taskId: hint.taskId },
              });

              await tx.checklistItem.createMany({
                data: actions.map((action, index) => ({
                  taskId: hint.taskId,
                  title: action.description,
                  isDone: false,
                  position: existingCount + index,
                })),
              });
            }
          }
          break;

        case "summary":
          if (hint.content) {
            const currentDescription = hint.task.description || "";
            updates.description = currentDescription
              ? `${currentDescription}\n\n[Summary]\n${hint.content}`
              : `[Summary]\n${hint.content}`;
          }
          break;

        case "priority":
          if (hint.content) {
            // Map priority string to enum value
            const priorityMap: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
              low: "LOW",
              medium: "MEDIUM",
              high: "HIGH",
            };
            const priorityValue = priorityMap[hint.content.toLowerCase()];
            if (priorityValue) {
              updates.priority = priorityValue;
            } else {
              this.logger.warn(`Invalid priority value: ${hint.content}`);
            }
          }
          break;

        case "duration":
          if (hint.content) {
            updates.duration = hint.content;
          }
          break;

        default:
          this.logger.warn(`Unknown hint type: ${hint.hintType}`);
      }

      // Apply updates to task if any
      if (Object.keys(updates).length > 0) {
        await tx.task.update({
          where: { id: hint.taskId },
          data: updates,
        });
      }
    });

    // Emit WebSocket update
    this.boardGateway.emitBoardUpdate(hint.task.boardId, {
      type: "task.updated",
      taskId: hint.taskId,
      hintApplied: id,
      timestamp: new Date().toISOString(),
    });

    const updatedHint = await this.prisma.hint.findUnique({
      where: { id },
    });

    this.logger.log(`Applied hint ${id} to task ${hint.taskId}`);
    return { message: "Hint applied successfully", hint: updatedHint };
  }

  /**
   * Dismiss a hint (mark as applied without applying it)
   */
  async dismissHint(id: string) {
    const hint = await this.prisma.hint.findUnique({
      where: { id },
      include: { task: { select: { boardId: true } } },
    });

    if (!hint) {
      throw new NotFoundException(`Hint not found: ${id}`);
    }

    const updated = await this.prisma.hint.update({
      where: { id },
      data: { applied: true },
    });

    this.logger.log(`Dismissed hint ${id}`);
    return updated;
  }

  /**
   * Delete a hint
   */
  async deleteHint(id: string) {
    const hint = await this.prisma.hint.findUnique({
      where: { id },
      include: { task: { select: { boardId: true } } },
    });

    if (!hint) {
      throw new NotFoundException(`Hint not found: ${id}`);
    }

    await this.prisma.hint.delete({
      where: { id },
    });

    this.logger.log(`Deleted hint ${id}`);
    return { success: true };
  }
}
