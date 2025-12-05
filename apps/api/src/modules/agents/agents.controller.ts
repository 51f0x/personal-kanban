import { Controller, Get, Param, NotFoundException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';

/**
 * Agents Controller
 * 
 * Note: Full agent processing happens in the worker service.
 * This controller provides information about agent capabilities.
 * To actually process tasks with agents, use the worker service directly
 * or set up BullMQ jobs to trigger agent processing.
 */
@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get information about agent processing for a task
   * GET /api/v1/agents/tasks/:taskId
   */
  @Get('tasks/:taskId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get task agent info', description: 'Get information about agent processing for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Agent processing information' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskAgentInfo(@Param('taskId') taskId: string) {
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
    const agentProcessing = metadata.agentProcessing as Record<string, unknown> | undefined;

    // Check if URL is present
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const urlInText = `${task.title} ${task.description || ''}`.match(urlRegex)?.[0];
    const urlInMetadata = metadata.url as string | undefined;
    const hasUrl = !!(urlInText || urlInMetadata);

    return {
      taskId: task.id,
      hasUrl,
      url: urlInText || urlInMetadata || null,
      agentProcessing: agentProcessing
        ? {
            processedAt: agentProcessing.processedAt,
            processingTimeMs: agentProcessing.processingTimeMs,
            hasWebContent: !!agentProcessing.webContent,
            hasSummarization: !!agentProcessing.summarization,
            confidence: agentProcessing.confidence,
            errors: agentProcessing.errors,
          }
        : null,
      availableAgents: [
        'web-content-agent',
        'content-summarizer-agent',
        'task-analyzer-agent',
        'context-extractor-agent',
        'action-extractor-agent',
      ],
      note: 'To process this task with agents, use the worker service or set up BullMQ job processing.',
    };
  }
}

