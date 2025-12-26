import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseAgent } from "../core/base-agent";
import type {
  TaskBreakdownResult,
  LocalBrain,
} from "../types/assistant.types";

/**
 * Task Breakdown Agent (C1)
 * Breaks down objective into concrete, sequential sub-tasks (15-60 min each)
 */
@Injectable()
export class TaskBreakdownAgent extends BaseAgent {
  readonly agentId = "task-breakdown";

  constructor(config: ConfigService) {
    super(config, TaskBreakdownAgent.name);
  }

  /**
   * Break down objective into tasks
   */
  async breakDown(
    objective: string,
    context?: LocalBrain["context"],
    constraints?: LocalBrain["constraints"],
  ): Promise<TaskBreakdownResult> {
    try {
      this.logOperation("Breaking down tasks", { objectiveLength: objective.length });

      const prompt = this.buildBreakdownPrompt(objective, context, constraints);
      const response = await this.generateLlmResponse(prompt, {
        context: "task-breakdown-breakdown",
        format: "json",
      });

      const parsed = this.parseBreakdownResponse(response);
      return {
        agentId: this.agentId,
        success: true,
        confidence: 0.85,
        tasks: parsed.tasks,
      };
    } catch (error) {
      this.logError("Task breakdown failed", error);
      return this.createErrorResult<TaskBreakdownResult>(error);
    }
  }

  /**
   * Build breakdown prompt
   */
  private buildBreakdownPrompt(
    objective: string,
    context?: LocalBrain["context"],
    constraints?: LocalBrain["constraints"],
  ): string {
    let prompt = `Du bist ein Task Breakdown Agent.
Zerlege das folgende Arbeitsziel in konkrete, logisch aufeinanderfolgende Teilschritte.
Die Schritte sollen so klein sein, dass sie jeweils in 15-60 Minuten umsetzbar sind.

Arbeitsziel: ${objective}

`;

    if (constraints?.timeBudget) {
      prompt += `Zeitbudget: ${constraints.timeBudget}\n`;
    }

    if (context?.deadline) {
      prompt += `Deadline: ${context.deadline}\n`;
    }

    prompt += `
Markiere jeden Schritt mit seinem Typ:
- preparation: Vorbereitung (z.B. Materialien sammeln, Tools vorbereiten)
- research: Recherche (z.B. Webrecherche, Dokumentation lesen)
- implementation: Umsetzung (z.B. Code schreiben, Design erstellen)
- followup: Nachbereitung (z.B. Testing, Dokumentation, Deployment)

Gib eine JSON-Antwort zurück mit folgendem Format:
{
  "tasks": [
    {
      "id": "T1",
      "title": "Kurzer Titel des Schritts",
      "description": "Detaillierte Beschreibung was zu tun ist",
      "type": "preparation|research|implementation|followup",
      "effort": "Geschätzte Zeit (z.B. '30 Min', '1 Stunde')",
      "dependencies": ["T0"] // IDs der Schritte die vorher erledigt werden müssen
    }
  ]
}

Die Tasks sollten logisch aufeinander aufbauen. Gib nur das JSON zurück, keine zusätzlichen Erklärungen.`;

    return prompt;
  }

  /**
   * Parse breakdown response from LLM
   */
  private parseBreakdownResponse(response: string): {
    tasks: TaskBreakdownResult["tasks"];
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);

      const tasks = parsed.tasks?.map((task: unknown) => ({
        ...task,
        status: "pending" as const,
      })) || [];

      return { tasks };
    } catch (error) {
      this.logError("Failed to parse breakdown response", error, { response });
      return { tasks: [] };
    }
  }
}

