import {
  Body,
  Controller,
  Logger,
  Post,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AssistantProgressService } from "./assistant-progress.service";
import { AssistantProgressDto } from "./dto/assistant-progress.dto";

/**
 * Assistant Progress Controller
 * Receives progress updates from worker and broadcasts to clients
 */
@ApiTags("assistant")
@Controller("assistant/progress")
export class AssistantProgressController {
  private readonly logger = new Logger(AssistantProgressController.name);

  constructor(
    private readonly assistantProgressService: AssistantProgressService,
  ) {}

  /**
   * Receive assistant processing progress from worker
   * POST /api/v1/assistant/progress
   */
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Report assistant progress",
    description:
      "Receives assistant processing progress updates from worker service",
  })
  @ApiResponse({ status: 200, description: "Progress received" })
  @ApiResponse({ status: 400, description: "Invalid progress data" })
  async reportProgress(
    @Body(ValidationPipe) dto: AssistantProgressDto,
  ): Promise<{ received: boolean }> {
    this.logger.debug(
      `Received assistant progress: ${dto.requestId} - ${dto.progress.stage} (${dto.progress.progress}%)`,
    );

    this.assistantProgressService.emitAssistantProgress(
      dto.requestId,
      dto.boardId,
      dto.progress,
    );

    return { received: true };
  }
}

