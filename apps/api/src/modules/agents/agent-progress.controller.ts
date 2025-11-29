import { Body, Controller, Post } from '@nestjs/common';
import { AgentProgressService } from './agent-progress.service';
import type { AgentProcessingProgress } from './types';

/**
 * Controller for receiving agent processing progress updates from worker
 */
@Controller('agents/progress')
export class AgentProgressController {
  constructor(private readonly agentProgressService: AgentProgressService) {}

  @Post('update')
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

