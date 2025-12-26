import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseAgent } from "../core/base-agent";
import type {
  FinalAssemblerResult,
  LocalBrain,
  PrioritizerSchedulerResult,
  WebResearcherResult,
} from "../types/assistant.types";

/**
 * Final Assembler Agent (Z)
 * Merges all outputs into a consistent work package
 */
@Injectable()
export class FinalAssemblerAgent extends BaseAgent {
  readonly agentId = "final-assembler";

  constructor(config: ConfigService) {
    super(config, FinalAssemblerAgent.name);
  }

  /**
   * Assemble final result from all agent outputs
   */
  async assemble(
    localBrain: LocalBrain,
    prioritizerResult?: PrioritizerSchedulerResult,
    webResearcherResult?: WebResearcherResult,
  ): Promise<FinalAssemblerResult> {
    try {
      this.logOperation("Assembling final result", {
        hasTasks: !!localBrain.taskBacklog && localBrain.taskBacklog.length > 0,
        hasSources: !!localBrain.sources && localBrain.sources.length > 0,
      });

      const prompt = this.buildAssemblerPrompt(
        localBrain,
        prioritizerResult,
        webResearcherResult,
      );
      const response = await this.generateLlmResponse(prompt, {
        context: "final-assembler-assemble",
        format: "json",
      });

      const parsed = this.parseAssemblerResponse(response, localBrain, prioritizerResult);
      return {
        agentId: this.agentId,
        success: true,
        confidence: 0.9,
        result: parsed,
      };
    } catch (error) {
      this.logError("Final assembly failed", error);
      return this.createErrorResult<FinalAssemblerResult>(error);
    }
  }

  /**
   * Build assembler prompt
   */
  private buildAssemblerPrompt(
    localBrain: LocalBrain,
    prioritizerResult?: PrioritizerSchedulerResult,
    webResearcherResult?: WebResearcherResult,
  ): string {
    let prompt = `Du bist ein Final Assembler Agent.
Erstelle ein konsistentes Arbeitspaket aus allen vorherigen Agent-Ergebnissen.

Ziel: ${localBrain.objective}

`;

    if (localBrain.taskBacklog && localBrain.taskBacklog.length > 0) {
      prompt += `Tasks:\n${localBrain.taskBacklog.map((task) => {
        return `- [${task.id}] ${task.title}: ${task.description || ""}`;
      }).join("\n")}\n\n`;
    }

    if (prioritizerResult?.prioritizedTasks) {
      prompt += `Priorisierte Tasks:\n${prioritizerResult.prioritizedTasks.map((pt) => {
        return `- [${pt.taskId}] Priorität: ${pt.priority}, Reihenfolge: ${pt.order}`;
      }).join("\n")}\n\n`;
    }

    if (prioritizerResult?.nextActions) {
      prompt += `Nächste Aktionen:\n${prioritizerResult.nextActions.map((na, idx) => {
        return `${idx + 1}. [${na.taskId}] ${na.description}`;
      }).join("\n")}\n\n`;
    }

    if (webResearcherResult?.sources && webResearcherResult.sources.length > 0) {
      prompt += `Recherche-Quellen:\n${webResearcherResult.sources.map((source) => {
        return `- ${source.title || source.url}`;
      }).join("\n")}\n\n`;
    }

    if (localBrain.risks && localBrain.risks.length > 0) {
      prompt += `Risiken:\n${localBrain.risks.map((risk) => {
        return `- ${risk.risk}${risk.mitigation ? ` (Mitigation: ${risk.mitigation})` : ""}`;
      }).join("\n")}\n\n`;
    }

    if (localBrain.constraints) {
      prompt += `Constraints: ${JSON.stringify(localBrain.constraints)}\n\n`;
    }

    prompt += `Erstelle ein finales Arbeitspaket mit:
- Kurzes Ziel + Erfolgskriterien
- Todo-Liste (mit Dependencies)
- Prioritäten + Zeitplan
- Recherche-Summary + Quellen
- Risiken + Mitigation
- "Next 3 Actions" für sofortigen Start

Gib eine JSON-Antwort zurück mit folgendem Format:
{
  "objective": "Kurze Zielbeschreibung",
  "successCriteria": ["Kriterium 1", "Kriterium 2"],
  "todoList": [
    {
      "id": "T1",
      "title": "Titel",
      "description": "Beschreibung",
      "dependencies": ["T0"],
      "priority": "must|should|could",
      "estimatedTime": "Geschätzte Zeit"
    }
  ],
  "priorities": {
    "must": ["T1", "T2"],
    "should": ["T3"],
    "could": ["T4"]
  },
  "schedule": {
    "today": ["T1", "T2"],
    "thisWeek": ["T3", "T4"]
  },
  "researchSummary": {
    "keyFindings": ["Finding 1", "Finding 2"],
    "sources": [
      {
        "url": "URL",
        "title": "Titel",
        "keyTakeaways": ["Takeaway 1"]
      }
    ]
  },
  "risks": [
    {
      "risk": "Risiko",
      "mitigation": "Mitigation",
      "probability": "low|medium|high"
    }
  ],
  "nextActions": [
    {
      "taskId": "T1",
      "description": "Beschreibung",
      "estimatedTime": "Geschätzte Zeit"
    }
  ]
}

Gib nur das JSON zurück, keine zusätzlichen Erklärungen.`;

    return prompt;
  }

  /**
   * Parse assembler response from LLM
   */
  private parseAssemblerResponse(
    response: string,
    localBrain: LocalBrain,
    prioritizerResult?: PrioritizerSchedulerResult,
  ): FinalAssemblerResult["result"] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);

      // Merge with actual data from local brain and prioritizer
      return {
        objective: parsed.objective || localBrain.objective,
        successCriteria: parsed.successCriteria || [],
        todoList: parsed.todoList || localBrain.taskBacklog?.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          dependencies: task.dependencies,
          priority: parsed.priorities?.must?.includes(task.id) ? "must" as const :
                   parsed.priorities?.should?.includes(task.id) ? "should" as const :
                   "could" as const,
          estimatedTime: task.effort,
        })) || [],
        priorities: parsed.priorities || {
          must: prioritizerResult?.prioritizedTasks?.filter((pt) => pt.priority === "must").map((pt) => pt.taskId) || [],
          should: prioritizerResult?.prioritizedTasks?.filter((pt) => pt.priority === "should").map((pt) => pt.taskId) || [],
          could: prioritizerResult?.prioritizedTasks?.filter((pt) => pt.priority === "could").map((pt) => pt.taskId) || [],
        },
        schedule: parsed.schedule || prioritizerResult?.schedule || {},
        researchSummary: parsed.researchSummary || {
          keyFindings: [],
          sources: localBrain.sources || [],
        },
        risks: parsed.risks || localBrain.risks || [],
        nextActions: parsed.nextActions || prioritizerResult?.nextActions || [],
      };
    } catch (error) {
      this.logError("Failed to parse assembler response", error, { response });
      // Fallback: create basic result from local brain
      return {
        objective: localBrain.objective,
        successCriteria: [],
        todoList: localBrain.taskBacklog?.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          dependencies: task.dependencies,
          priority: "should" as const,
          estimatedTime: task.effort,
        })) || [],
        priorities: {
          must: [],
          should: [],
          could: [],
        },
        schedule: {},
        researchSummary: {
          keyFindings: [],
          sources: localBrain.sources || [],
        },
        risks: localBrain.risks || [],
        nextActions: prioritizerResult?.nextActions || [],
      };
    }
  }
}

