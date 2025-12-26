import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseAgent } from "../core/base-agent";
import type {
  AnalystResult,
  LocalBrain,
} from "../types/assistant.types";

/**
 * Analyst Agent (A1)
 * Clarifies objective, scope, audience, deadline, success criteria
 */
@Injectable()
export class AnalystAgent extends BaseAgent {
  readonly agentId = "analyst";

  constructor(config: ConfigService) {
    super(config, AnalystAgent.name);
  }

  /**
   * Analyze task and extract objective, constraints, deliverables, open questions
   */
  async analyze(
    task: string,
    context?: LocalBrain["context"],
    constraints?: LocalBrain["constraints"],
    deliverables?: LocalBrain["deliverables"],
  ): Promise<AnalystResult> {
    try {
      this.logOperation("Analyzing task", { taskLength: task.length });

      const prompt = this.buildAnalysisPrompt(task, context, constraints, deliverables);
      const response = await this.generateLlmResponse(prompt, {
        context: "analyst-analyze",
        format: "json",
      });

      const parsed = this.parseAnalysisResponse(response);
      return {
        agentId: this.agentId,
        success: true,
        confidence: 0.8,
        ...parsed,
      };
    } catch (error) {
      this.logError("Analysis failed", error);
      return this.createErrorResult<AnalystResult>(error);
    }
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(
    task: string,
    context?: LocalBrain["context"],
    constraints?: LocalBrain["constraints"],
    deliverables?: LocalBrain["deliverables"],
  ): string {
    let prompt = `Du bist ein Analyst für Arbeitsvorbereitungen.
Deine Aufgabe ist es, folgende Aufgabe klar zu definieren und zu strukturieren.

Aufgabe: ${task}

`;

    if (context) {
      prompt += `Kontext:
- Rolle: ${context.role || "Nicht spezifiziert"}
- Publikum: ${context.audience || "Nicht spezifiziert"}
- Umfang: ${context.scope || "Nicht spezifiziert"}
- Deadline: ${context.deadline || "Nicht spezifiziert"}
- Ressourcen: ${context.resources?.join(", ") || "Nicht spezifiziert"}
- Tools: ${context.tools?.join(", ") || "Nicht spezifiziert"}

`;
    }

    if (constraints) {
      prompt += `Constraints:
- Zeitbudget: ${constraints.timeBudget || "Nicht spezifiziert"}
- Qualitätsniveau: ${constraints.qualityLevel || "Nicht spezifiziert"}
- Must-haves: ${constraints.mustHaves?.join(", ") || "Keine"}

`;
    }

    if (deliverables && deliverables.length > 0) {
      prompt += `Gewünschte Outputs:
${deliverables.map((d) => `- ${d.name}${d.format ? ` (Format: ${d.format})` : ""}${d.description ? `: ${d.description}` : ""}`).join("\n")}

`;
    }

    prompt += `Analysiere die Aufgabe und gib eine JSON-Antwort zurück mit folgendem Format:
{
  "objective": "Klares, präzises Arbeitsziel",
  "constraints": {
    "timeBudget": "Zeitbudget falls bekannt",
    "qualityLevel": "Qualitätsniveau falls relevant",
    "mustHaves": ["Must-have Anforderungen"]
  },
  "deliverables": [
    {
      "name": "Name des Deliverables",
      "format": "Format falls spezifiziert",
      "description": "Beschreibung"
    }
  ],
  "openQuestions": [
    {
      "question": "Offene Frage",
      "neededInput": "Was wird benötigt um diese Frage zu beantworten"
    }
  ],
  "assumptions": ["Annahmen die gemacht werden"],
  "risks": [
    {
      "risk": "Risiko-Beschreibung",
      "mitigation": "Mögliche Mitigation",
      "probability": "low|medium|high"
    }
  ],
  "context": {
    "role": "Rolle falls nicht spezifiziert aber relevant",
    "audience": "Zielpublikum falls nicht spezifiziert aber relevant",
    "scope": "Umfang falls nicht spezifiziert aber relevant",
    "deadline": "Deadline falls nicht spezifiziert aber relevant",
    "resources": ["Relevante Ressourcen"],
    "tools": ["Relevante Tools"]
  }
}

Gib nur das JSON zurück, keine zusätzlichen Erklärungen.`;

    return prompt;
  }

  /**
   * Parse analysis response from LLM
   */
  private parseAnalysisResponse(response: string): Omit<
    AnalystResult,
    "agentId" | "success" | "confidence"
  > {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);

      return {
        objective: parsed.objective || "",
        constraints: parsed.constraints,
        deliverables: parsed.deliverables,
        openQuestions: parsed.openQuestions,
        assumptions: parsed.assumptions,
        risks: parsed.risks,
        context: parsed.context,
      };
    } catch (error) {
      this.logError("Failed to parse analysis response", error, { response });
      // Return minimal result if parsing fails
      return {
        objective: response.substring(0, 500),
      };
    }
  }
}

