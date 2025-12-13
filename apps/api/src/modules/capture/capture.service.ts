import  { PrismaService } from "@personal-kanban/shared";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { parseCaptureText } from "@personal-kanban/shared";

import  { TaskService } from "../tasks/task.service";
import  { AgentCaptureService } from "./agent-capture.service";
import  { CaptureRequestDto } from "./dto/capture-request.dto";

@Injectable()
export class CaptureService {
  private readonly logger = new Logger(CaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskService: TaskService,
    private readonly agentCaptureService: AgentCaptureService,
  ) {}

  async quickAdd(dto: CaptureRequestDto) {
    const board = await this.prisma.board.findUnique({
      where: { id: dto.boardId },
      include: { columns: { orderBy: { position: "asc" } } },
    });

    if (!board) {
      throw new NotFoundException("Board not found");
    }

    const targetColumn = dto.columnId
      ? board.columns.find((col) => col.id === dto.columnId)
      : (board.columns.find((col) => col.type === "INPUT") ?? board.columns[0]);

    if (!targetColumn) {
      throw new NotFoundException("Target column not found");
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

    // Trigger agent processing with WebSocket callbacks (runs in background)
    // This will show progress to users in real-time
    this.agentCaptureService
      .processTaskWithAgentsAsync(task.id, board.id)
      .catch((error) => {
        this.logger.error(
          `Failed to start agent processing for task ${task.id}: ${error}`,
        );
      });

    return task;
  }
}
