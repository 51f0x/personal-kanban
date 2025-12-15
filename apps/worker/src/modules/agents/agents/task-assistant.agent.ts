import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseAndValidateJson } from "@personal-kanban/shared";
import { taskAssistantResponseSchema } from "../../../shared/schemas/agent-schemas";
import { validateDescription } from "../../../shared/utils/input-validator.util";
import { ActionItem } from "./action-extractor.agent";
import { BaseAgent } from "../core/base-agent";

/**
 * Task Assistant Agent Result
 * Implements the complete workflow: Clarification -> Structure -> Implementation -> QA
 */
export interface TaskAssistantResult {
  agentId: string;
  success: boolean;
  confidence?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  // Clarification phase
  clarificationQuestions?: string[];
  needsClarification?: boolean;
  // Structure phase
  structure?: {
    goal: string;
    requirements: string[];
    constraints: string[];
    desiredResult: string;
    format?: string;
    style?: string;
    assumptions?: string[];
  };
  // Implementation phase
  implementation?: {
    result: string;
    steps: string[];
    deliverables: string[];
  };
  // Quality assurance phase
  qualityCheck?: {
    completeness: number; // 0-1
    clarity: number; // 0-1
    practicality: number; // 0-1
    optimizations: string[];
    finalResult: string;
  };
}

/**
 * Task Assistant Agent
 * Implements a complete workflow for task completion:
 * 1. Clarification - Identifies all necessary questions
 * 2. Structure - Defines goal, requirements, constraints, desired result
 * 3. Implementation - Completes the task fully
 * 4. Quality Assurance - Reviews and optimizes the result
 */
@Injectable()
export class TaskAssistantAgent extends BaseAgent {
  readonly agentId = "task-assistant-agent";

  constructor(config: ConfigService) {
    super(config, TaskAssistantAgent.name);
  }

  /**
   * Process a task through the complete workflow
   */
  async processTask(
    title: string,
    description?: string,
    webContent?: string,
    contentSummary?: string,
    suggestedActions?: ActionItem[],
  ): Promise<TaskAssistantResult> {
    try {
      await this.ensureModel();

      const prompt = this.buildTaskAssistantPrompt(
        title,
        description,
        webContent,
        contentSummary,
        suggestedActions,
      );

      this.logOperation("Processing task with task assistant workflow", {
        title: title.substring(0, 50),
        hasDescription: !!description,
        hasWebContent: !!webContent,
        hasContentSummary: !!contentSummary,
        hasActions: !!suggestedActions && suggestedActions.length > 0,
      });

      const response = await this.callLlm(
        () =>
          this.ollama.generate({
            model: this.model,
            prompt,
            stream: false,
            format: "json",
            options: {
              temperature: 0.7, // Balanced creativity and focus
            },
          }),
        "task assistant processing",
      );

      const responseText = response.response || "";

      // Log raw response for debugging if it seems problematic
      if (!responseText.trim() || responseText.trim().length < 10) {
        this.logger.warn("Received empty or very short response from LLM", {
          responseLength: responseText.length,
        });
      }

      // Parse and validate JSON
      const parseResult = parseAndValidateJson(
        responseText,
        taskAssistantResponseSchema,
        {
          warn: (msg, ...args) => this.logger.warn(msg, ...args),
        },
        "task assistant",
      );

      if (parseResult.success) {
        // Type assertion based on Joi schema validation
        const data = parseResult.data as {
          clarification: {
            needsClarification: boolean;
            questions?: string[];
          };
          structure: {
            goal: string;
            requirements?: string[];
            constraints?: string[];
            desiredResult: string;
            format?: string | null;
            style?: string | null;
            assumptions?: string[];
          };
          implementation: {
            result: string;
            steps?: string[];
            deliverables?: string[];
          };
          qualityCheck: {
            completeness: number;
            clarity: number;
            practicality: number;
            optimizations?: string[];
            finalResult: string;
          };
          confidence: number;
        };

        // Validate that we have a final result
        const finalResult =
          data.qualityCheck?.finalResult || data.implementation?.result || "";

        if (finalResult.trim().length === 0) {
          this.logError(
            "Empty result generated",
            new Error("Final result is empty"),
          );
          return {
            agentId: this.agentId,
            success: false,
            confidence: 0,
            error: "Generated result is empty",
          };
        }

        // Validate description length if needed
        const descValidation = validateDescription(finalResult);
        if (!descValidation.valid) {
          this.logger.warn(
            `Result validation warning: ${descValidation.error}. Truncating if needed.`,
          );
        }

        return {
          agentId: this.agentId,
          success: true,
          confidence: data.qualityCheck?.completeness || data.confidence || 0.7,
          clarificationQuestions: data.clarification?.questions || [],
          needsClarification: data.clarification?.needsClarification || false,
          structure: data.structure
            ? {
                goal: data.structure.goal,
                requirements: data.structure.requirements || [],
                constraints: data.structure.constraints || [],
                desiredResult: data.structure.desiredResult,
                ...(data.structure.format !== null &&
                data.structure.format !== undefined
                  ? { format: data.structure.format }
                  : {}),
                ...(data.structure.style !== null &&
                data.structure.style !== undefined
                  ? { style: data.structure.style }
                  : {}),
                assumptions: data.structure.assumptions || [],
              }
            : undefined,
          implementation: data.implementation
            ? {
                result: this.validateAndTruncateContent(
                  data.implementation.result,
                ),
                steps: data.implementation.steps || [],
                deliverables: data.implementation.deliverables || [],
              }
            : undefined,
          qualityCheck: data.qualityCheck
            ? {
                completeness: data.qualityCheck.completeness || 0,
                clarity: data.qualityCheck.clarity || 0,
                practicality: data.qualityCheck.practicality || 0,
                optimizations: data.qualityCheck.optimizations || [],
                finalResult: this.validateAndTruncateContent(
                  data.qualityCheck.finalResult,
                ),
              }
            : undefined,
          metadata: {
            model: this.model,
            hasWebContent: !!webContent,
            hasContentSummary: !!contentSummary,
            hasSuggestedActions:
              !!suggestedActions && suggestedActions.length > 0,
          },
        };
      }

      const errorMessage =
        "error" in parseResult
          ? parseResult.error
          : "Failed to parse task assistant result";

      // Log more details for debugging
      this.logError(
        "Failed to parse task assistant result",
        new Error(errorMessage),
        {
          rawResponseLength: responseText.length,
          rawResponsePreview: responseText,
          rawResponseEnd: responseText,
        },
      );

      // Return error but don't crash - this is Phase 3, so other phases succeeded
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: `JSON parsing failed: ${errorMessage}. Response length: ${responseText.length} chars`,
        metadata: {
          rawResponsePreview: responseText,
          rawResponseLength: responseText.length,
          parseError: errorMessage,
        },
      };
    } catch (error) {
      this.logError("Error processing task with task assistant", error, {
        title: title,
      });
      return {
        agentId: this.agentId,
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Build the task assistant prompt
   */
  private buildTaskAssistantPrompt(
    title: string,
    description?: string,
    webContent?: string,
    contentSummary?: string,
    suggestedActions?: ActionItem[],
  ): string {
    let taskText = `Task: ${title}`;
    if (description) {
      taskText += `\n\nDescription:\n${description}`;
    }

    let contentText = "";
    if (webContent) {
      contentText = `\n\nContent from URL:\n${webContent}`;
    } else if (contentSummary) {
      contentText = `\n\nContent Summary:\n${contentSummary}`;
    }

    let actionsText = "";
    if (suggestedActions && suggestedActions.length > 0) {
      actionsText = "\n\n[Suggested Actions]\n";
      actionsText += suggestedActions
        .map(
          (action, idx) =>
            `${idx + 1}. ${action.description}${action.priority ? ` (Priority: ${action.priority})` : ""}`,
        )
        .join("\n");
    }

    return `Du bist mein persönlicher Task-Assistent.

Ziel:
Ich möchte einen Task erledigen, ohne ihn selbst vorbereiten zu müssen. 
Du übernimmst die komplette Strukturierung, Planung und Ausführung.

Vorgehen (verpflichtend):

1. Klärung
   - Analysiere den Task und identifiziere ALLE notwendigen Fragen, die du brauchst,
     um den Task vollständig und korrekt zu erledigen.
   - Gehe davon aus, dass nichts vorbereitet wurde.
   - Frage nur das Nötigste, aber nichts Relevantes darf fehlen.
   - Wenn der Task bereits vollständig ist, setze needsClarification auf false.

2. Struktur
   - Fasse nach der Klärung alle Informationen zusammen
   - Definiere klar:
     • Ziel des Tasks  
     • Anforderungen  
     • Randbedingungen  
     • gewünschtes Ergebnis  
     • Format / Stil (falls relevant)
   - Markiere sinnvolle Annahmen, wenn Informationen fehlen

3. Umsetzung
   - Erledige den Task vollständig
   - Liefere ein direkt nutzbares Ergebnis
   - Keine Platzhalter, keine offenen Punkte
   - Liste die Schritte auf, die du durchgeführt hast
   - Liste die Deliverables auf

4. Qualitätssicherung
   - Prüfe dein Ergebnis kritisch
   - Optimiere es auf Klarheit, Vollständigkeit und Praxistauglichkeit
   - Gib eine finale, optimierte Version aus

Regeln:
- Arbeite proaktiv
- Denke mit
- Triff sinnvolle Annahmen, wenn Informationen fehlen (und markiere sie)
- Keine unnötigen Erklärungen
- Fokus auf Ergebnis

Task:
${taskText}${contentText}${actionsText}

Generiere ein JSON-Objekt mit folgender Struktur:

{
  "clarification": {
    "needsClarification": true or false,
    "questions": ["Frage 1", "Frage 2"] or [] (NIE leere Strings in Arrays! Wenn keine Fragen, dann leeres Array [])
  },
  "structure": {
    "goal": "Klares Ziel des Tasks",
    "requirements": ["Anforderung 1", "Anforderung 2"] or [],
    "constraints": ["Randbedingung 1"] or [] (NIE null! Immer Array, auch wenn leer []),
    "desiredResult": "Beschreibt das gewünschte Ergebnis",
    "format": "Markdown" or null,
    "style": "Formal" or null,
    "assumptions": ["Annahme 1"] or [] (NIE leere Strings! Immer Array mit echten Strings oder leeres Array [])
  },
  "implementation": {
    "result": "Vollständiges, direkt nutzbares Ergebnis - MUSS ausgefüllt sein, NIE leer!",
    "steps": ["Schritt 1", "Schritt 2"] or [],
    "deliverables": ["Deliverable 1"] or [] (NIE null! Immer Array, auch wenn leer [])
  },
  "qualityCheck": {
    "completeness": 0.9,
    "clarity": 0.8,
    "practicality": 0.85,
    "optimizations": ["Optimierung 1"] or [] (NIE null! Immer Array, auch wenn leer []),
    "finalResult": "Finale, optimierte Version - MUSS ausgefüllt sein, NIE leer!"
  },
  "confidence": 0.85
}

KRITISCHE REGELN FÜR DAS JSON-FORMAT:
1. Arrays: 
   - NIE leere Strings ("") in Arrays! Wenn ein Array leer sein soll, verwende [] (leeres Array)
   - Wenn ein Array optional ist und leer, verwende [] nicht null
   - Jeder String in einem Array muss Inhalt haben

2. Required String-Felder (MÜSSEN ausgefüllt sein):
   - "implementation.result" - MUSS einen nicht-leeren String enthalten
   - "qualityCheck.finalResult" - MUSS einen nicht-leeren String enthalten
   - "structure.goal" - MUSS einen nicht-leeren String enthalten
   - "structure.desiredResult" - MUSS einen nicht-leeren String enthalten

3. Optional Arrays (verwende [] statt null):
   - "structure.constraints" - wenn leer, dann [] nicht null
   - "structure.assumptions" - wenn leer, dann [] nicht null
   - "implementation.deliverables" - wenn leer, dann [] nicht null
   - "qualityCheck.optimizations" - wenn leer, dann [] nicht null

4. Fragen-Array:
   - Wenn needsClarification false ist, verwende [] (leeres Array)
   - Wenn needsClarification true ist, liste konkrete Fragen auf
   - NIE leere Strings ("") im questions-Array!

WICHTIG:
- Das finalResult im qualityCheck ist das Endergebnis, das verwendet werden soll
- Wenn needsClarification true ist, kannst du trotzdem mit sinnvollen Annahmen arbeiten
- Das Ergebnis muss vollständig und direkt nutzbar sein
- Keine Platzhalter wie "[HIER EINFÜGEN]" oder "TODO"
- Wenn der Task unklar ist, stelle konkrete Fragen, arbeite aber trotzdem mit bestmöglichen Annahmen

Gib nur gültiges JSON zurück, kein Markdown-Formatting.`;
  }
}
