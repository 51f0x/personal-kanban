import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseAgent } from "../core/base-agent";
import type {
  PrioritizerSchedulerResult,
  LocalBrain,
} from "../types/assistant.types";

/**
 * Prioritizer & Scheduler Agent (D2)
 * Prioritizes tasks by impact/urgency/dependencies and creates schedule
 */
@Injectable()
export class PrioritizerSchedulerAgent extends BaseAgent {
  readonly agentId = "prioritizer-scheduler";

  constructor(config: ConfigService) {
    super(config, PrioritizerSchedulerAgent.name);
  }

  /**
   * Prioritize tasks and create schedule
   */
  async prioritizeAndSchedule(
    tasks: LocalBrain["taskBacklog"],
    constraints?: LocalBrain["constraints"],
    context?: LocalBrain["context"],
  ): Promise<PrioritizerSchedulerResult> {
    try {
      this.logOperation("Prioritizing and scheduling tasks", {
        tasksCount: tasks?.length || 0,
      });

      if (!tasks || tasks.length === 0) {
        return {
          agentId: this.agentId,
          success: true,
          confidence: 1.0,
          prioritizedTasks: [],
          schedule: {},
          nextActions: [],
        };
      }

      const prompt = this.buildPrioritizationPrompt(tasks, constraints, context);
      const response = await this.generateLlmResponse(prompt, {
        context: "prioritizer-scheduler-prioritize",
        format: "json",
      });

      const parsed = this.parsePrioritizationResponse(response, tasks);
      return {
        agentId: this.agentId,
        success: true,
        confidence: 0.85,
        ...parsed,
      };
    } catch (error) {
      this.logError("Prioritization failed", error);
      return this.createErrorResult<PrioritizerSchedulerResult>(error);
    }
  }

  /**
   * Build prioritization prompt
   */
  private buildPrioritizationPrompt(
    tasks: LocalBrain["taskBacklog"],
    constraints?: LocalBrain["constraints"],
    context?: LocalBrain["context"],
  ): string {
    let prompt = `Du bist ein Prioritizer & Scheduler Agent.
Priorisiere die folgenden Aufgaben nach Wichtigkeit und Dringlichkeit.
Erstelle zusätzlich eine empfohlene Reihenfolge für die Bearbeitung unter Berücksichtigung von Konzentration und Abhängigkeiten.

Aufgaben:
${tasks
  ?.map((task, idx) => {
    // Normalize dependencies to a string array to avoid runtime type errors
    const rawDeps = (task as any).dependencies;
    const depsArray = Array.isArray(rawDeps)
      ? rawDeps
      : rawDeps
        ? [String(rawDeps)]
        : [];

    return `${idx + 1}. [${task.id}] ${task.title}
   - Typ: ${task.type || "Nicht spezifiziert"}
   - Beschreibung: ${task.description || "Keine"}
   - Geschätzte Zeit: ${task.effort || "Nicht geschätzt"}
   - Abhängigkeiten: ${depsArray.length > 0 ? depsArray.join(", ") : "Keine"}`;
  })
  .join("\n\n")}

`;

    if (constraints?.timeBudget) {
      prompt += `Verfügbares Zeitbudget: ${constraints.timeBudget}\n`;
    }

    if (context?.deadline) {
      prompt += `Deadline: ${context.deadline}\n`;
    }

    prompt += `
Priorisiere die Aufgaben nach:
- Muss (must): Kritisch, muss erledigt werden
- Sollte (should): Wichtig, sollte erledigt werden
- Könnte (could): Optional, kann erledigt werden

Erstelle eine Reihenfolge unter Berücksichtigung von Abhängigkeiten.
Identifiziere die nächsten 3 Aktionen die sofort gestartet werden können.

Gib eine JSON-Antwort zurück mit folgendem Format:
{
  "prioritizedTasks": [
    {
      "taskId": "T1",
      "priority": "must|should|could",
      "order": 1,
      "estimatedTime": "Geschätzte Zeit"
    }
  ],
  "schedule": {
    "today": ["T1", "T2"],
    "thisWeek": ["T3", "T4"],
    "recommendations": ["Empfehlung 1", "Empfehlung 2"]
  },
  "nextActions": [
    {
      "taskId": "T1",
      "description": "Beschreibung der nächsten Aktion",
      "estimatedTime": "Geschätzte Zeit"
    }
  ]
}

Gib nur das JSON zurück, keine zusätzlichen Erklärungen.`;

    return prompt;
  }

  /**
   * Parse prioritization response from LLM
   */
  private parsePrioritizationResponse(
    response: string,
    originalTasks: LocalBrain["taskBacklog"],
  ): Omit<PrioritizerSchedulerResult, "agentId" | "success" | "confidence"> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);

      // Ensure all tasks are included (fill missing ones with default priority)
      const taskIds = originalTasks?.map((t) => t.id) || [];
      const prioritizedIds = parsed.prioritizedTasks?.map((pt: { taskId: string }) => pt.taskId) || [];
      const missingIds = taskIds.filter((id) => !prioritizedIds.includes(id));

      const prioritizedTasks = [
        ...(parsed.prioritizedTasks || []),
        ...missingIds.map((id, idx) => ({
          taskId: id,
          priority: "could" as const,
          order: (parsed.prioritizedTasks?.length || 0) + idx + 1,
        })),
      ];

      return {
        prioritizedTasks,
        schedule: parsed.schedule || {},
        nextActions: parsed.nextActions || [],
      };
    } catch (error) {
      this.logError("Failed to parse prioritization response", error, { response });
      // Fallback: create basic prioritization
      const prioritizedTasks = originalTasks?.map((task, idx) => ({
        taskId: task.id,
        priority: "should" as const,
        order: idx + 1,
        estimatedTime: task.effort,
      })) || [];

      return {
        prioritizedTasks,
        schedule: {},
        nextActions: prioritizedTasks.slice(0, 3).map((pt) => {
          const task = originalTasks?.find((t) => t.id === pt.taskId);
          return {
            taskId: pt.taskId,
            description: task?.title || "",
            estimatedTime: pt.estimatedTime,
          };
        }),
      };
    }
  }
}

