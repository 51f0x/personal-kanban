import type {
  BoardData,
  BoardWithRelations,
  FindBoardsOptions,
  IBoardRepository,
} from "@personal-kanban/shared";
import { Injectable } from "@nestjs/common";
import { BoardId, PrismaService } from "@personal-kanban/shared";

/**
 * Prisma implementation of IBoardRepository
 */
@Injectable()
export class PrismaBoardRepository implements IBoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: BoardId,
    options?: FindBoardsOptions,
  ): Promise<BoardWithRelations | null> {
    const include: Record<string, boolean | object> = {};

    if (options?.includeColumns) {
      include.columns = { orderBy: { position: "asc" } };
    }
    if (options?.includeProjects) {
      include.projects = true;
    }

    const board = await this.prisma.board.findUnique({
      where: { id: id.value },
      include: Object.keys(include).length > 0 ? include : undefined,
    });

    if (!board) {
      return null;
    }

    return this.mapToBoardData(board) as BoardWithRelations;
  }

  async findByOwnerId(
    ownerId: string,
    options?: FindBoardsOptions,
  ): Promise<BoardWithRelations[]> {
    const include: Record<string, boolean | object> = {};

    if (options?.includeColumns) {
      include.columns = { orderBy: { position: "asc" } };
    }
    if (options?.includeProjects) {
      include.projects = true;
    }

    const boards = await this.prisma.board.findMany({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
      include: Object.keys(include).length > 0 ? include : undefined,
    });

    return boards.map(
      (board) => this.mapToBoardData(board) as BoardWithRelations,
    );
  }

  async save(board: BoardData): Promise<BoardData> {
    if (await this.exists(BoardId.from(board.id))) {
      return this.update(BoardId.from(board.id), board);
    }
    return this.create(board);
  }

  async create(
    board: Omit<BoardData, "id" | "createdAt" | "updatedAt">,
  ): Promise<BoardData> {
    const created = await this.prisma.board.create({
      data: {
        ownerId: board.ownerId,
        name: board.name,
        description: board.description,
        config: board.config as any,
      },
    });

    return this.mapToBoardData(created);
  }

  async update(id: BoardId, data: Partial<BoardData>): Promise<BoardData> {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.config !== undefined) updateData.config = data.config as any;

    const updated = await this.prisma.board.update({
      where: { id: id.value },
      data: updateData,
    });

    return this.mapToBoardData(updated);
  }

  async delete(id: BoardId): Promise<void> {
    await this.prisma.board.delete({
      where: { id: id.value },
    });
  }

  async exists(id: BoardId): Promise<boolean> {
    const count = await this.prisma.board.count({
      where: { id: id.value },
    });
    return count > 0;
  }

  /**
   * Map Prisma board to BoardData or BoardWithRelations
   */
  private mapToBoardData(board: any): BoardData | BoardWithRelations {
    const baseData: BoardData = {
      id: board.id,
      ownerId: board.ownerId,
      name: board.name,
      description: board.description,
      config: board.config as Record<string, unknown> | null,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    };

    // Include relations if they exist
    const withRelations: BoardWithRelations = { ...baseData };

    if (board.columns) {
      withRelations.columns = board.columns.map((col: any) => ({
        id: col.id,
        boardId: col.boardId,
        name: col.name,
        type: col.type,
        wipLimit: col.wipLimit,
        position: col.position,
      }));
    }

    if (board.projects) {
      withRelations.projects = board.projects.map((proj: any) => ({
        id: proj.id,
        name: proj.name,
        description: proj.description,
      }));
    }

    return withRelations;
  }
}
