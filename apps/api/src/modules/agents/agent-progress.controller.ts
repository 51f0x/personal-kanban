import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { AgentProgressService } from './agent-progress.service';
import type { AgentProcessingProgress } from './types';
import { AgentProcessingProgressDto } from './dto/agent-progress.dto';
import { InternalServiceTokenGuard } from '../../guards/internal-service-token.guard';

/**
 * Controller for receiving agent processing progress updates from worker
 */
@ApiTags('agents')
@Controller('agents/progress')
export class AgentProgressController {
  constructor(private readonly agentProgressService: AgentProgressService) {}

  @Post('update')
  @UseGuards(InternalServiceTokenGuard)
  @ApiSecurity('internal-service-token')
  @ApiOperation({ summary: 'Update agent progress', description: 'Receive agent processing progress updates from worker' })
  @ApiBody({ type: AgentProcessingProgressDto, description: 'Agent processing progress' })
  @ApiResponse({ status: 200, description: 'Progress update received', schema: { type: 'object', properties: { success: { type: 'boolean' } } } })
  @ApiResponse({ status: 400, description: 'Invalid progress data' })
  async updateProgress(@Body() progress: AgentProcessingProgress): Promise<{ success: boolean }> {
    // Extract taskId and boardId from progress
    const { taskId, details } = progress;
    
    // Get boardId from details or extract from task
    let boardId: string | undefined;
    if (details && typeof details === 'object' && 'boardId' in details) {
      boardId = details.boardId as string;
    }

    if (!taskId || !boardId) {
      return { success: false };
    }

    // Broadcast progress via WebSocket
    this.agentProgressService.emitAgentProgress(taskId, boardId, progress);

    return { success: true };
  }
}

