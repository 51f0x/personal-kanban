import { Injectable, Logger } from "@nestjs/common";
import { AnalystAgent } from "../agents/analyst.agent";
import { DecisionSupportAgent } from "../agents/decision-support.agent";
import { FinalAssemblerAgent } from "../agents/final-assembler.agent";
import { PrioritizerSchedulerAgent } from "../agents/prioritizer-scheduler.agent";
import { ResearchPlannerAgent } from "../agents/research-planner.agent";
import { TaskBreakdownAgent } from "../agents/task-breakdown.agent";
import { WebResearcherAgent } from "../agents/web-researcher.agent";
import { LocalBrainService } from "./local-brain.service";
import type {
  AssistantProcessingProgress,
  AssistantProcessingResult,
  AssistantRequest,
  LocalBrain,
} from "../types/assistant.types";

/**
 * Job definition for DAG execution
 */
interface Job {
  id: string;
  agentId: string;
  dependencies: string[];
  run: () => Promise<void>;
}

/**
 * Assistant Orchestrator
 * Coordinates specialized agents according to DAG with dependencies
 * Phases: (1) Analysis, (2) Local Brain Prep, (3) Parallel processing, (4) Final assembly
 */
@Injectable()
export class AssistantOrchestrator {
  private readonly logger = new Logger(AssistantOrchestrator.name);

  constructor(
    private readonly localBrainService: LocalBrainService,
    private readonly analystAgent: AnalystAgent,
    private readonly taskBreakdownAgent: TaskBreakdownAgent,
    private readonly researchPlannerAgent: ResearchPlannerAgent,
    private readonly webResearcherAgent: WebResearcherAgent,
    private readonly prioritizerSchedulerAgent: PrioritizerSchedulerAgent,
    private readonly decisionSupportAgent: DecisionSupportAgent,
    private readonly finalAssemblerAgent: FinalAssemblerAgent,
  ) {}

  /**
   * Process assistant request through DAG workflow
   */
  async process(
    request: AssistantRequest,
    onProgress?: (
      progress: AssistantProcessingProgress,
    ) => void | Promise<void>,
  ): Promise<AssistantProcessingResult> {
    const startTime = Date.now();
    const requestId = request.requestId;
    // Use projectId if provided, otherwise fall back to requestId for backward compatibility
    // However, for tasks assigned to projects, projectId should always be provided
    const projectId = request.projectId || requestId;
    const errors: string[] = [];
    const progressHistory: AssistantProcessingProgress[] = [];

    try {
      const progress = (
        stage: AssistantProcessingProgress["stage"],
        message: string,
        details?: Record<string, unknown>,
      ) => {
        const progressUpdate: AssistantProcessingProgress = {
          requestId,
          stage,
          progress: this.calculateProgress(stage),
          message,
          details,
          timestamp: new Date().toISOString(),
        };
        progressHistory.push(progressUpdate);
        if (onProgress) {
          Promise.resolve(onProgress(progressUpdate)).catch((err) => {
            this.logger.warn("Progress callback failed", err);
          });
        }
      };

      progress("analysis", "Starting analysis phase...");

      // Phase 1: Analysis
      const analystResult = await this.analystAgent.analyze(
        request.task,
        request.context,
        request.constraints,
        request.deliverables,
      );

      if (!analystResult.success) {
        throw new Error(`Analysis failed: ${analystResult.error}`);
      }

      // Phase 2: Local Brain Prep
      progress("local-brain-prep", "Preparing local brain...");
      // Get or create local brain for the project
      let localBrain = await this.localBrainService.getOrCreate(projectId);
      // Merge analyst result into the existing local brain
      localBrain = await this.localBrainService.mergeAnalystResult(
        projectId,
        analystResult,
      );

      // Build DAG jobs
      const jobs = this.buildDAG(projectId, localBrain, progress, errors);

      // Execute DAG respecting dependencies
      progress(
        "task-breakdown",
        "Starting task breakdown and research planning...",
      );
      await this.executeDAG(jobs, progress, errors);

      // Refresh local brain after DAG execution
      const refreshedBrain = await this.localBrainService.get(projectId);
      if (!refreshedBrain) {
        throw new Error("Local brain not found after DAG execution");
      }
      localBrain = refreshedBrain;

      // Phase 4: Final Assembly
      progress("final-assembly", "Assembling final result...");
      const prioritizerResult = localBrain.history?.find(
        (h) => h.agentId === "prioritizer-scheduler",
      )?.output as any;
      const webResearcherResult = localBrain.history?.find(
        (h) => h.agentId === "web-researcher",
      )?.output as any;

      const finalResult = await this.finalAssemblerAgent.assemble(
        localBrain,
        prioritizerResult,
        webResearcherResult,
      );

      if (!finalResult.success) {
        throw new Error(`Final assembly failed: ${finalResult.error}`);
      }

      progress("completed", "Processing completed successfully", {
        processingTimeMs: Date.now() - startTime,
      });

      const processingTimeMs = Date.now() - startTime;

      return {
        requestId,
        localBrain,
        analyst: analystResult,
        taskBreakdown: localBrain.history?.find(
          (h) => h.agentId === "task-breakdown",
        )?.output as any,
        researchPlanner: localBrain.history?.find(
          (h) => h.agentId === "research-planner",
        )?.output as any,
        webResearcher: webResearcherResult,
        prioritizerScheduler: prioritizerResult,
        decisionSupport: localBrain.history?.find(
          (h) => h.agentId === "decision-support",
        )?.output as any,
        finalAssembler: finalResult,
        processingTimeMs,
        errors: errors.length > 0 ? errors : undefined,
        progress: progressHistory,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error processing assistant request ${requestId}: ${errorMessage}`,
      );

      const progressUpdate: AssistantProcessingProgress = {
        requestId,
        stage: "error",
        progress: 0,
        message: `Processing failed: ${errorMessage}`,
        details: { error: errorMessage },
        timestamp: new Date().toISOString(),
      };
      progressHistory.push(progressUpdate);

      const fallbackBrain = await this.localBrainService.get(projectId);
      return {
        requestId,
        localBrain: fallbackBrain || this.createEmptyBrain(),
        processingTimeMs: Date.now() - startTime,
        errors: [errorMessage],
        progress: progressHistory,
      };
    }
  }

  /**
   * Build DAG jobs based on dependencies
   */
  private buildDAG(
    projectId: string,
    localBrain: LocalBrain,
    progress: (
      stage: AssistantProcessingProgress["stage"],
      message: string,
      details?: Record<string, unknown>,
    ) => void,
    errors: string[],
  ): Job[] {
    const jobs: Job[] = [];

    // B1: Local Brain Prep (already done, but we can add tasks to it)
    // This is already handled in mergeAnalystResult, so we skip it here

    // C1: Task Breakdown (depends on: B1/Local Brain)
    jobs.push({
      id: "C1",
      agentId: "task-breakdown",
      dependencies: [],
      run: async () => {
        progress("task-breakdown", "Breaking down tasks...");
        const result = await this.taskBreakdownAgent.breakDown(
          localBrain.objective,
          localBrain.context,
          localBrain.constraints,
        );
        if (result.success) {
          await this.localBrainService.mergeTaskBreakdownResult(projectId, result);
        } else {
          errors.push(`Task breakdown failed: ${result.error}`);
        }
      },
    });

    // C2: Research Planner (depends on: B1/Local Brain)
    jobs.push({
      id: "C2",
      agentId: "research-planner",
      dependencies: [],
      run: async () => {
        progress("research-planning", "Planning research...");
        const result = await this.researchPlannerAgent.planResearch(
          localBrain.objective,
          localBrain.context,
          localBrain.deliverables,
        );
        if (result.success) {
          await this.localBrainService.mergeResearchPlannerResult(projectId, result);
        } else {
          errors.push(`Research planning failed: ${result.error}`);
        }
      },
    });

    // D1: Web Research (depends on: C2/Research Planner)
    jobs.push({
      id: "D1",
      agentId: "web-researcher",
      dependencies: ["C2"],
      run: async () => {
        const updatedBrain = await this.localBrainService.get(projectId);
        if (!updatedBrain || !updatedBrain.researchPlan) {
          this.logger.warn("No research plan available for web research");
          return;
        }
        progress("web-research", "Performing web research...");
        const result = await this.webResearcherAgent.research(
          updatedBrain.researchPlan,
          updatedBrain.objective,
        );
        if (result.success) {
          await this.localBrainService.mergeWebResearcherResult(projectId, result);
        } else {
          errors.push(`Web research failed: ${result.error}`);
        }
      },
    });

    // D2: Prioritizer & Scheduler (depends on: C1/Task Breakdown)
    jobs.push({
      id: "D2",
      agentId: "prioritizer-scheduler",
      dependencies: ["C1"],
      run: async () => {
        const updatedBrain = await this.localBrainService.get(projectId);
        if (
          !updatedBrain ||
          !updatedBrain.taskBacklog ||
          updatedBrain.taskBacklog.length === 0
        ) {
          this.logger.warn("No tasks available for prioritization");
          return;
        }
        progress("prioritization", "Prioritizing and scheduling tasks...");
        const result =
          await this.prioritizerSchedulerAgent.prioritizeAndSchedule(
            updatedBrain.taskBacklog,
            updatedBrain.constraints,
            updatedBrain.context,
          );
        if (result.success) {
          await this.localBrainService.mergePrioritizerSchedulerResult(
            projectId,
            result,
          );
        } else {
          errors.push(`Prioritization failed: ${result.error}`);
        }
      },
    });

    // E1: Decision Support (optional, depends on: D1/Web Research + B1/Local Brain)
    // Only add if there are decisions to make
    if (localBrain.openQuestions && localBrain.openQuestions.length > 0) {
      jobs.push({
        id: "E1",
        agentId: "decision-support",
        dependencies: ["D1"],
        run: async () => {
          const updatedBrain = await this.localBrainService.get(projectId);
          if (!updatedBrain) {
            this.logger.warn("No local brain available for decision support");
            return;
          }
          const question = updatedBrain.openQuestions?.[0]?.question;
          if (!question) return;

          progress("decision-support", "Supporting decision...");
          // For now, we create a simple decision from open questions
          // In a full implementation, you'd extract options from the question
          const result = await this.decisionSupportAgent.supportDecision(
            question,
            ["Option A", "Option B"], // Placeholder - would come from analysis
            updatedBrain.constraints,
            updatedBrain.sources,
            updatedBrain.context,
          );
          if (result.success) {
            await this.localBrainService.mergeDecisionSupportResult(
              projectId,
              result,
            );
          } else {
            errors.push(`Decision support failed: ${result.error}`);
          }
        },
      });
    }

    return jobs;
  }

  /**
   * Execute DAG respecting dependencies
   */
  private async executeDAG(
    jobs: Job[],
    _progress: (
      stage: AssistantProcessingProgress["stage"],
      message: string,
      details?: Record<string, unknown>,
    ) => void,
    errors: string[],
  ): Promise<void> {
    const completed = new Set<string>();
    const running = new Set<string>();

    while (completed.size < jobs.length) {
      // Find jobs that can run (all dependencies completed)
      const ready = jobs.filter(
        (job) =>
          !completed.has(job.id) &&
          !running.has(job.id) &&
          job.dependencies.every((dep) => completed.has(dep)),
      );

      if (ready.length === 0 && running.size === 0) {
        // Deadlock or missing dependencies
        const remaining = jobs.filter((job) => !completed.has(job.id));
        this.logger.error(
          `DAG deadlock: remaining jobs ${remaining.map((j) => j.id).join(", ")}`,
        );
        break;
      }

      // Run ready jobs in parallel
      const promises = ready.map(async (job) => {
        running.add(job.id);
        try {
          await job.run();
          completed.add(job.id);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push(`Job ${job.id} (${job.agentId}) failed: ${errorMessage}`);
          this.logger.error(`Job ${job.id} failed`, error);
          completed.add(job.id); // Mark as completed even on failure to avoid deadlock
        } finally {
          running.delete(job.id);
        }
      });

      await Promise.allSettled(promises);
    }
  }

  /**
   * Calculate progress percentage based on stage
   */
  private calculateProgress(
    stage: AssistantProcessingProgress["stage"],
  ): number {
    const stageProgress: Record<AssistantProcessingProgress["stage"], number> =
      {
        analysis: 10,
        "local-brain-prep": 20,
        "task-breakdown": 35,
        "research-planning": 40,
        "web-research": 60,
        prioritization: 70,
        "decision-support": 80,
        "final-assembly": 90,
        completed: 100,
        error: 0,
      };
    return stageProgress[stage] || 0;
  }

  /**
   * Create empty brain structure
   */
  private createEmptyBrain(): LocalBrain {
    return {
      objective: "",
      openQuestions: [],
      taskBacklog: [],
      sources: [],
      decisions: [],
      risks: [],
      deliverables: [],
      history: [],
    };
  }
}
