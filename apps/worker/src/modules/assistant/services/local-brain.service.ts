import { Inject, Injectable, Logger } from "@nestjs/common";
import type { PrismaService } from "@personal-kanban/shared";
import type {
  LocalBrain,
  AnalystResult,
  TaskBreakdownResult,
  ResearchPlannerResult,
  WebResearcherResult,
  PrioritizerSchedulerResult,
  DecisionSupportResult,
} from "../types/assistant.types";

/**
 * Service to manage and update the Local Brain (shared knowledge storage)
 * Local brains are persisted in the database and are 1:1 with projects
 */
@Injectable()
export class LocalBrainService {
  private readonly logger = new Logger(LocalBrainService.name);

  constructor(@Inject("PrismaService") private readonly prisma: PrismaService) {}

  /**
   * Get local brain by project ID
   */
  async get(projectId: string): Promise<LocalBrain | undefined> {
    const brainRecord = await this.prisma.localBrain.findUnique({
      where: { projectId },
    });

    if (!brainRecord) {
      return undefined;
    }

    return this.deserializeBrain(brainRecord);
  }

  /**
   * Get or create local brain for a project
   */
  async getOrCreate(projectId: string): Promise<LocalBrain> {
    const existing = await this.get(projectId);
    if (existing) {
      return existing;
    }

    // Create empty brain for the project
    const emptyBrain = this.createEmptyBrain();
    await this.createOrUpdate(projectId, emptyBrain);
    return emptyBrain;
  }

  /**
   * Create or update a local brain
   */
  async createOrUpdate(projectId: string, brain: Partial<LocalBrain>): Promise<LocalBrain> {
    const existing = await this.get(projectId);
    const existingBrain = existing || this.createEmptyBrain();

    const updated: LocalBrain = {
      ...existingBrain,
      ...brain,
      // Merge arrays instead of replacing
      openQuestions: brain.openQuestions
        ? [...(existingBrain.openQuestions || []), ...brain.openQuestions]
        : existingBrain.openQuestions,
      taskBacklog: brain.taskBacklog || existingBrain.taskBacklog,
      sources: brain.sources
        ? [...(existingBrain.sources || []), ...brain.sources]
        : existingBrain.sources,
      decisions: brain.decisions
        ? [...(existingBrain.decisions || []), ...brain.decisions]
        : existingBrain.decisions,
      risks: brain.risks
        ? [...(existingBrain.risks || []), ...brain.risks]
        : existingBrain.risks,
      deliverables: brain.deliverables || existingBrain.deliverables,
    };

    // Persist to database
    const brainRecord = await this.prisma.localBrain.upsert({
      where: { projectId },
      create: {
        projectId,
        ...this.serializeBrain(updated),
      },
      update: {
        ...this.serializeBrain(updated),
      },
    });

    this.logger.debug(`Local brain updated for project ${projectId}`);
    return this.deserializeBrain(brainRecord);
  }

  /**
   * Merge analyst result into local brain
   */
  async mergeAnalystResult(
    projectId: string,
    result: AnalystResult,
  ): Promise<LocalBrain> {
    const brain = await this.createOrUpdate(projectId, {
      objective: result.objective,
      constraints: result.constraints,
      deliverables: result.deliverables,
      openQuestions: result.openQuestions,
      risks: result.risks,
      context: result.context,
    });

    await this.addHistory(projectId, "analyst", result);
    return brain;
  }

  /**
   * Merge task breakdown result into local brain
   */
  async mergeTaskBreakdownResult(
    projectId: string,
    result: TaskBreakdownResult,
  ): Promise<LocalBrain> {
    const brain = await this.createOrUpdate(projectId, {
      taskBacklog: result.tasks,
    });

    await this.addHistory(projectId, "task-breakdown", result);
    return brain;
  }

  /**
   * Merge research planner result into local brain
   */
  async mergeResearchPlannerResult(
    projectId: string,
    result: ResearchPlannerResult,
  ): Promise<LocalBrain> {
    const brain = await this.createOrUpdate(projectId, {
      researchPlan: result.researchPlan,
    });

    await this.addHistory(projectId, "research-planner", result);
    return brain;
  }

  /**
   * Merge web researcher result into local brain
   */
  async mergeWebResearcherResult(
    projectId: string,
    result: WebResearcherResult,
  ): Promise<LocalBrain> {
    const existing = await this.get(projectId);
    const existingSources = existing?.sources || [];

    const brain = await this.createOrUpdate(projectId, {
      sources: result.sources
        ? [...existingSources, ...result.sources]
        : existingSources,
    });

    await this.addHistory(projectId, "web-researcher", result);
    return brain;
  }

  /**
   * Merge prioritizer/scheduler result into local brain
   */
  async mergePrioritizerSchedulerResult(
    projectId: string,
    result: PrioritizerSchedulerResult,
  ): Promise<LocalBrain> {
    // Update task backlog with priorities and order
    const brain = await this.get(projectId);
    if (!brain || !result.prioritizedTasks) {
      await this.addHistory(projectId, "prioritizer-scheduler", result);
      return brain || this.createEmptyBrain();
    }

    const updatedTasks = brain.taskBacklog?.map((task) => {
      const prioritized = result.prioritizedTasks?.find(
        (pt) => pt.taskId === task.id,
      );
      return prioritized
        ? {
            ...task,
            // Store priority in metadata if needed
          }
        : task;
    });

    const updated = await this.createOrUpdate(projectId, {
      taskBacklog: updatedTasks,
    });

    await this.addHistory(projectId, "prioritizer-scheduler", result);
    return updated;
  }

  /**
   * Merge decision support result into local brain
   */
  async mergeDecisionSupportResult(
    projectId: string,
    result: DecisionSupportResult,
  ): Promise<LocalBrain> {
    const brain = await this.createOrUpdate(projectId, {
      decisions: result.decision ? [result.decision] : undefined,
    });

    await this.addHistory(projectId, "decision-support", result);
    return brain;
  }

  /**
   * Add history entry
   */
  private async addHistory(
    projectId: string,
    agentId: string,
    output: unknown,
  ): Promise<void> {
    const brain = await this.get(projectId);
    if (!brain) return;

    const history = brain.history || [];
    history.push({
      runId: `${agentId}-${Date.now()}`,
      agentId,
      output,
      timestamp: new Date().toISOString(),
    });

    await this.createOrUpdate(projectId, { history });
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

  /**
   * Delete local brain (cleanup) - called when project is deleted
   */
  async delete(projectId: string): Promise<void> {
    await this.prisma.localBrain.deleteMany({
      where: { projectId },
    });
    this.logger.debug(`Local brain deleted for project ${projectId}`);
  }

  /**
   * Serialize LocalBrain to database format
   */
  private serializeBrain(brain: LocalBrain): {
    objective: string;
    context?: unknown;
    constraints?: unknown;
    openQuestions?: unknown;
    taskBacklog?: unknown;
    researchPlan?: unknown;
    sources?: unknown;
    decisions?: unknown;
    risks?: unknown;
    deliverables?: unknown;
    history?: unknown;
  } {
    return {
      objective: brain.objective || "",
      context: brain.context ? JSON.parse(JSON.stringify(brain.context)) : null,
      constraints: brain.constraints ? JSON.parse(JSON.stringify(brain.constraints)) : null,
      openQuestions: brain.openQuestions ? JSON.parse(JSON.stringify(brain.openQuestions)) : null,
      taskBacklog: brain.taskBacklog ? JSON.parse(JSON.stringify(brain.taskBacklog)) : null,
      researchPlan: brain.researchPlan ? JSON.parse(JSON.stringify(brain.researchPlan)) : null,
      sources: brain.sources ? JSON.parse(JSON.stringify(brain.sources)) : null,
      decisions: brain.decisions ? JSON.parse(JSON.stringify(brain.decisions)) : null,
      risks: brain.risks ? JSON.parse(JSON.stringify(brain.risks)) : null,
      deliverables: brain.deliverables ? JSON.parse(JSON.stringify(brain.deliverables)) : null,
      history: brain.history ? JSON.parse(JSON.stringify(brain.history)) : null,
    };
  }

  /**
   * Deserialize database record to LocalBrain
   */
  private deserializeBrain(record: {
    objective: string;
    context?: unknown;
    constraints?: unknown;
    openQuestions?: unknown;
    taskBacklog?: unknown;
    researchPlan?: unknown;
    sources?: unknown;
    decisions?: unknown;
    risks?: unknown;
    deliverables?: unknown;
    history?: unknown;
  }): LocalBrain {
    return {
      objective: record.objective || "",
      context: record.context as LocalBrain["context"] | undefined,
      constraints: record.constraints as LocalBrain["constraints"] | undefined,
      openQuestions: record.openQuestions as LocalBrain["openQuestions"] | undefined,
      taskBacklog: record.taskBacklog as LocalBrain["taskBacklog"] | undefined,
      researchPlan: record.researchPlan as LocalBrain["researchPlan"] | undefined,
      sources: record.sources as LocalBrain["sources"] | undefined,
      decisions: record.decisions as LocalBrain["decisions"] | undefined,
      risks: record.risks as LocalBrain["risks"] | undefined,
      deliverables: record.deliverables as LocalBrain["deliverables"] | undefined,
      history: record.history as LocalBrain["history"] | undefined,
    };
  }
}

