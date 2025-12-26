import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseAgent } from "../core/base-agent";
import type {
  DecisionSupportResult,
  LocalBrain,
} from "../types/assistant.types";

/**
 * Decision Support Agent (E1, optional)
 * Helps with decisions between options using research results and constraints
 */
@Injectable()
export class DecisionSupportAgent extends BaseAgent {
  readonly agentId = "decision-support";

  constructor(config: ConfigService) {
    super(config, DecisionSupportAgent.name);
  }

  /**
   * Support decision making between options
   */
  async supportDecision(
    question: string,
    options: string[],
    constraints?: LocalBrain["constraints"],
    sources?: LocalBrain["sources"],
    context?: LocalBrain["context"],
  ): Promise<DecisionSupportResult> {
    try {
      this.logOperation("Supporting decision", {
        questionLength: question.length,
        optionsCount: options.length,
      });

      if (!options || options.length < 2) {
        return {
          agentId: this.agentId,
          success: false,
          confidence: 0,
          error: "At least 2 options are required for decision support",
        };
      }

      const prompt = this.buildDecisionPrompt(
        question,
        options,
        constraints,
        sources,
        context,
      );
      const response = await this.generateLlmResponse(prompt, {
        context: "decision-support-decide",
        format: "json",
      });

      const parsed = this.parseDecisionResponse(response, question, options);
      return {
        agentId: this.agentId,
        success: true,
        confidence: 0.8,
        decision: parsed,
      };
    } catch (error) {
      this.logError("Decision support failed", error);
      return this.createErrorResult<DecisionSupportResult>(error);
    }
  }

  /**
   * Build decision support prompt
   */
  private buildDecisionPrompt(
    question: string,
    options: string[],
    constraints?: LocalBrain["constraints"],
    sources?: LocalBrain["sources"],
    context?: LocalBrain["context"],
  ): string {
    let prompt = `Du bist ein Decision Support Agent.
Hilf bei einer Entscheidung zwischen den folgenden Optionen.

Frage/Entscheidung: ${question}

Optionen:
${options.map((opt, idx) => `${idx + 1}. ${opt}`).join("\n")}

`;

    if (constraints) {
      prompt += `Constraints:
- Zeitbudget: ${constraints.timeBudget || "Nicht spezifiziert"}
- Qualitätsniveau: ${constraints.qualityLevel || "Nicht spezifiziert"}
- Must-haves: ${constraints.mustHaves?.join(", ") || "Keine"}

`;
    }

    if (context) {
      prompt += `Kontext: ${JSON.stringify(context)}\n\n`;
    }

    if (sources && sources.length > 0) {
      prompt += `Relevante Recherche-Ergebnisse:\n${sources.map((source, idx) => {
        return `${idx + 1}. ${source.title || source.url}
   ${source.keyTakeaways?.slice(0, 3).join("; ") || ""}`;
      }).join("\n\n")}

`;
    }

    prompt += `Vergleiche die Optionen anhand klarer Kriterien und gib eine begründete Empfehlung.
Definiere auch "Wenn X, dann Y"-Regeln für verschiedene Szenarien.

Gib eine JSON-Antwort zurück mit folgendem Format:
{
  "question": "${question}",
  "options": ${JSON.stringify(options)},
  "criteria": ["Kriterium 1", "Kriterium 2"],
  "recommendation": "Empfohlene Option",
  "rationale": "Begründung warum diese Option empfohlen wird",
  "comparison": {
    "Option 1": {
      "pros": ["Vorteil 1", "Vorteil 2"],
      "cons": ["Nachteil 1", "Nachteil 2"],
      "score": 0.8
    }
  },
  "scenarios": [
    {
      "condition": "Wenn X",
      "recommendation": "Dann Option Y",
      "reason": "Begründung"
    }
  ]
}

Gib nur das JSON zurück, keine zusätzlichen Erklärungen.`;

    return prompt;
  }

  /**
   * Parse decision response from LLM
   */
  private parseDecisionResponse(
    response: string,
    question: string,
    options: string[],
  ): DecisionSupportResult["decision"] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);

      return {
        question: parsed.question || question,
        options: parsed.options || options,
        criteria: parsed.criteria || [],
        recommendation: parsed.recommendation || options[0],
        rationale: parsed.rationale || "Keine Begründung verfügbar",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logError("Failed to parse decision response", error, { response });
      // Fallback decision
      return {
        question,
        options,
        criteria: [],
        recommendation: options[0],
        rationale: "Fehler beim Parsen der Entscheidung - erste Option als Fallback",
        timestamp: new Date().toISOString(),
      };
    }
  }
}

