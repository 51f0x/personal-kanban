import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PrismaService } from "@personal-kanban/shared";

/**
 * Assistant Controller
 *
 * Note: Full assistant processing happens in the worker service.
 * This controller provides information about assistant capabilities.
 */
@ApiTags("assistant")
@Controller("assistant")
export class AssistantController {
  private readonly logger = new Logger(AssistantController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get information about assistant processing for a task
   * GET /api/v1/assistant/tasks/:taskId
   */
  @Get("tasks/:taskId")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get task assistant info",
    description: "Get information about assistant processing for a task",
  })
  @ApiParam({ name: "taskId", description: "Task ID" })
  @ApiResponse({ status: 200, description: "Assistant processing information" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async getTaskAssistantInfo(@Param("taskId") taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        metadata: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }

    const metadata = (task.metadata || {}) as Record<string, unknown>;
    const assistantProcessing = metadata.assistantProcessing as
      | Record<string, unknown>
      | undefined;

    // Check if URL is present
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const urlInText = `${task.title} ${task.description || ""}`.match(
      urlRegex,
    )?.[0];
    const urlInMetadata = metadata.url as string | undefined;
    const hasUrl = !!(urlInText || urlInMetadata);

    return {
      taskId: task.id,
      hasUrl,
      url: urlInMetadata || urlInText || null,
      processing: assistantProcessing || null,
      capabilities: {
        taskBreakdown: true,
        researchPlanning: hasUrl,
        webResearch: hasUrl,
        prioritization: true,
        decisionSupport: true,
      },
    };
  }
}

