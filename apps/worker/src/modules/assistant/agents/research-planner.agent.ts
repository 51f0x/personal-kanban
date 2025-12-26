import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseAgent } from "../core/base-agent";
import type {
  ResearchPlannerResult,
  LocalBrain,
} from "../types/assistant.types";

/**
 * Research Planner Agent (C2)
 * Creates research plan: guiding questions, search terms, source types, quality criteria
 */
@Injectable()
export class ResearchPlannerAgent extends BaseAgent {
  readonly agentId = "research-planner";

  constructor(config: ConfigService) {
    super(config, ResearchPlannerAgent.name);
  }

  /**
   * Create research plan
   */
  async planResearch(
    objective: string,
    context?: LocalBrain["context"],
    deliverables?: LocalBrain["deliverables"],
  ): Promise<ResearchPlannerResult> {
    try {
      this.logOperation("Planning research", {
        objectiveLength: objective.length,
      });

      const prompt = this.buildResearchPlanPrompt(objective, context, deliverables);
      const response = await this.generateLlmResponse(prompt, {
        context: "research-planner-plan",
        format: "json",
      });

      const parsed = this.parseResearchPlanResponse(response);
      return {
        agentId: this.agentId,
        success: true,
        confidence: 0.8,
        researchPlan: parsed,
      };
    } catch (error) {
      this.logError(
        "Research planning failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      return this.createErrorResult<ResearchPlannerResult>(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Build research plan prompt
   */
  private buildResearchPlanPrompt(
    objective: string,
    context?: LocalBrain["context"],
    deliverables?: LocalBrain["deliverables"],
  ): string {
    let prompt = `Du bist ein Research Planner Agent.
Erstelle einen Rechercheplan für folgendes Thema.

Thema/Ziel: ${objective}

`;

    if (context) {
      prompt += `Kontext: ${JSON.stringify(context)}\n\n`;
    }

    if (deliverables && deliverables.length > 0) {
      prompt += `Gewünschte Outputs:\n${deliverables.map((d) => `- ${d.name}`).join("\n")}\n\n`;
    }

    prompt += `Erstelle einen Rechercheplan mit:
- Leitfragen: Welche Fragen müssen durch Recherche beantwortet werden?
- Suchbegriffe: Relevante Suchbegriffe für Websuche
- Quellenarten: Welche Arten von Quellen sind relevant (z.B. offizielle Dokumentation, Tutorials, Stack Overflow, GitHub)?
- Qualitätskriterien: Wann ist eine Quelle vertrauenswürdig?
- Stop-Kriterien: Wann ist die Recherche gut genug?

Gib eine JSON-Antwort zurück mit folgendem Format:
{
  "guidingQuestions": ["Frage 1", "Frage 2"],
  "searchTerms": ["Suchbegriff 1", "Suchbegriff 2"],
  "sourceTypes": ["Quellenart 1", "Quellenart 2"],
  "qualityCriteria": ["Kriterium 1", "Kriterium 2"],
  "stopCriteria": "Wann ist Recherche gut genug"
}

Gib nur das JSON zurück, keine zusätzlichen Erklärungen.`;

    return prompt;
  }

  /**
   * Parse research plan response from LLM
   */
  private parseResearchPlanResponse(
    response: string,
  ): ResearchPlannerResult["researchPlan"] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);

      return {
        guidingQuestions: parsed.guidingQuestions || [],
        searchTerms: parsed.searchTerms || [],
        sourceTypes: parsed.sourceTypes || [],
        qualityCriteria: parsed.qualityCriteria || [],
        stopCriteria:
          parsed.stopCriteria ||
          "Wenn genug relevante Informationen gefunden wurden",
      };
    } catch (error) {
      this.logError("Failed to parse research plan response", error, {
        response,
      });
      return {
        guidingQuestions: [],
        searchTerms: [],
        sourceTypes: [],
        qualityCriteria: [],
        stopCriteria: "Wenn genug relevante Informationen gefunden wurden",
      };
    }
  }
}
