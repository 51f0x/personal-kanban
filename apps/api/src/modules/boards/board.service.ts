import { Inject, Injectable } from "@nestjs/common";
import {
  BoardId,
  BoardUpdatedEvent,
  IBoardRepository,
  IEventBus,
  PrismaService,
} from "@personal-kanban/shared";
import { Prisma } from "@prisma/client";

import { CreateBoardDto } from "./dto/create-board.input";
import { UpdateBoardDto } from "./dto/update-board.input";

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("IBoardRepository")
    private readonly boardRepository: IBoardRepository,
    @Inject("IEventBus") private readonly eventBus: IEventBus,
  ) {}

  async createBoard(input: CreateBoardDto) {
    const config = input.config
      ? typeof input.config === "object"
        ? (input.config as Record<string, unknown>)
        : null
      : null;

    const board = await this.boardRepository.create({
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      config,
    });

    // Map to Prisma format for backward compatibility
    return {
      ...board,
      config: board.config ?? Prisma.JsonNull,
    };
  }

  async listBoardsForOwner(ownerId: string) {
    const boards = await this.boardRepository.findByOwnerId(ownerId, {
      includeColumns: true,
      includeProjects: true,
    });

    // Map to Prisma format for backward compatibility
    return boards.map((board) => ({
      ...board,
      columns: board.columns || [],
      projects: board.projects || [],
      config: board.config ?? Prisma.JsonNull,
    }));
  }

  async getBoardById(id: string) {
    const boardId = BoardId.from(id);
    const board = await this.boardRepository.findById(boardId, {
      includeColumns: true,
      includeProjects: true,
    });

    if (!board) {
      return null;
    }

    // Map to Prisma format for backward compatibility
    return {
      ...board,
      columns: board.columns || [],
      projects: board.projects || [],
      config: board.config ?? Prisma.JsonNull,
    };
  }

  async updateBoard(id: string, input: UpdateBoardDto) {
    const boardId = BoardId.from(id);
    const updateData: any = {
      name: input.name,
      description:
        input.description === undefined ? undefined : input.description,
      config:
        input.config === undefined
          ? undefined
          : input.config === null
            ? null
            : input.config,
    };

    const updatedBoard = await this.boardRepository.update(boardId, updateData);

    // Publish domain event
    await this.eventBus.publish(new BoardUpdatedEvent(boardId, updateData));

    // Map to Prisma format for backward compatibility
    return {
      ...updatedBoard,
      config: updatedBoard.config ?? Prisma.JsonNull,
    };
  }

  async deleteBoard(id: string) {
    // First, get the board to find the owner
    const boardId = BoardId.from(id);
    const board = await this.boardRepository.findById(boardId);

    if (!board) {
      throw new Error("Board not found");
    }

    // Check if this board is the default board for the owner
    const owner = await this.prisma.user.findUnique({
      where: { id: board.ownerId },
      select: { defaultBoardId: true },
    });

    const isDefaultBoard = owner?.defaultBoardId === id;

    // Manually cascade delete related records since schema doesn't have onDelete: Cascade
    // Delete in order to respect foreign key constraints

    // 1. Delete all task events first (they reference tasks)
    await this.prisma.taskEvent.deleteMany({
      where: { boardId: id },
    });

    // 2. Delete all tasks (which will cascade delete hints and checklist items via onDelete: Cascade)
    // TaskTag junction table will also be cleaned up via cascade
    await this.prisma.task.deleteMany({
      where: { boardId: id },
    });

    // 3. Delete all columns (tasks are already deleted, so this is safe)
    await this.prisma.column.deleteMany({
      where: { boardId: id },
    });

    // 4. Delete all tags (TaskTag junction table already cleaned up when tasks were deleted)
    await this.prisma.tag.deleteMany({
      where: { boardId: id },
    });

    // 5. Delete all projects (tasks are already deleted, so this is safe)
    await this.prisma.project.deleteMany({
      where: { boardId: id },
    });

    // 6. Delete all rules
    await this.prisma.rule.deleteMany({
      where: { boardId: id },
    });

    // 7. Delete all recurring templates
    await this.prisma.recurringTemplate.deleteMany({
      where: { boardId: id },
    });

    // 8. Delete the board itself
    await this.boardRepository.delete(boardId);

    // 9. If this was the default board, set the next board as default (or null if no boards left)
    if (isDefaultBoard) {
      const remainingBoards = await this.prisma.board.findMany({
        where: { ownerId: board.ownerId },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true },
      });

      await this.prisma.user.update({
        where: { id: board.ownerId },
        data: {
          defaultBoardId:
            remainingBoards.length > 0 ? remainingBoards[0].id : null,
        },
      });
    }

    return { success: true, wasDefault: isDefaultBoard };
  }
}
