import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, type OnApplicationShutdown } from "@nestjs/common";
import { PrismaService } from "@personal-kanban/shared";
import { Job } from "bullmq";
import { AgentResultSenderService } from "../services/agent-result-sender.service";
import { TaskProcessorService } from "../services/task-processor.service";

interface AgentProcessingJobData {
  taskId: string;
  boardId?: string; // Optional, can be extracted from task if needed
  progressCallbackUrl?: string; // Deprecated - kept for backward compatibility
}

/**
 * Job processor for agent processing queue
 * Processes tasks with agents and reports progress via HTTP callbacks
 */
@Processor("agent-processing")
export class AgentJobProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(AgentJobProcessor.name);

  constructor(
    private readonly taskProcessorService: TaskProcessorService,
    private readonly prisma: PrismaService,
    private readonly resultSenderService: AgentResultSenderService,
  ) {
    super();
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Shutting down agent job processor (signal: ${signal})`);
    // WorkerHost handles cleanup automatically, but we log for visibility
  }

  async process(job: Job<AgentProcessingJobData>): Promise<void> {
    const { taskId, boardId } = job.data;

    // Validate job data
    if (!taskId || typeof taskId !== "string" || taskId.trim().length === 0) {
      throw new Error(
        "Invalid taskId in job data: taskId must be a non-empty string",
      );
    }

    if (
      boardId !== undefined &&
      (typeof boardId !== "string" || boardId.trim().length === 0)
    ) {
      throw new Error(
        "Invalid boardId in job data: boardId must be a non-empty string if provided",
      );
    }

    this.logger.log(`Processing agent job for task ${taskId}`);

    try {
      // Get boardId from task if not provided
      let taskBoardId = boardId;
      if (!taskBoardId) {
        const task = await this.prisma.task.findUnique({
          where: { id: taskId },
          select: { boardId: true },
        });
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
        taskBoardId = task.boardId;
      }

      // Process task with agents and get results
      // Progress events are now published via event bus instead of HTTP callbacks
      // updateTask: true means results will be applied to task and hints created
      const results = await this.taskProcessorService.processTaskWithAgents(
        taskId,
        {
          updateTask: true, // Apply results to task and create hints
          skipWebContent: false,
          skipSummarization: false,
          // onProgress callback removed - events are published automatically
        },
      );

      // Send results back to API via queue
      if (results) {
        await this.resultSenderService.sendResult(taskId, taskBoardId, results);
      }

      this.logger.log(`Completed agent processing for task ${taskId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Error processing agent job for task ${taskId}: ${errorMessage}`,
      );
      throw error; // Re-throw to mark job as failed
    }
  }
}
