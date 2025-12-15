#!/usr/bin/env ts-node

/**
 * Standalone test script for worker agents
 * Tests agents without the overhead of API and UI
 * All output is printed to the console
 */

import * as readline from "node:readline";
import { ConfigService } from "@nestjs/config";
import { PrismaService, TaskId } from "@personal-kanban/shared";
import { ActionExtractorAgent } from "./modules/agents/agents/action-extractor.agent";
import { AgentSelectorAgent } from "./modules/agents/agents/agent-selector.agent";
import { ContentSummarizerAgent } from "./modules/agents/agents/content-summarizer.agent";
import { ContextExtractorAgent } from "./modules/agents/agents/context-extractor.agent";
import { TaskAnalyzerAgent } from "./modules/agents/agents/task-analyzer.agent";
import { TaskAssistantAgent } from "./modules/agents/agents/task-assistant.agent";
import { WebContentAgent } from "./modules/agents/agents/web-content.agent";
import { AgentOrchestrator } from "./modules/agents/services/agent-orchestrator.service";
import type {
  AgentProcessingProgress,
  AgentProcessingResult,
} from "./modules/agents/types/types";

// ============================================================================
// Mock Services
// ============================================================================

class MockConfigService extends ConfigService {
  get<T = any>(key: string, defaultValue?: T): T {
    const envValue = process.env[key];
    if (envValue !== undefined) {
      if (typeof defaultValue === "number") {
        const num = Number(envValue);
        return (Number.isNaN(num) ? defaultValue : num) as T;
      }
      return envValue as T;
    }
    return defaultValue as T;
  }
}

class MockPrismaService {
  constructor(
    private readonly taskTitle: string,
    private readonly taskDescription: string | undefined,
    private readonly taskUrl: string | undefined,
  ) {}

  task = {
    findUnique: async (args: { where: { id: string }; select: any }) => {
      const taskId = args.where.id;
      console.log(`[MockPrisma] Fetching task: ${taskId}`);
      const boardId = process.env.TEST_BOARD_ID || TaskId.generate().value;
      return {
        id: taskId,
        boardId,
        title: this.taskTitle,
        description: this.taskDescription,
        metadata: this.taskUrl ? { url: this.taskUrl } : {},
      };
    },
  };
}

class MockEventBus {
  async publish(event: any): Promise<void> {
    console.log(`[EventBus] Published event: ${event.constructor.name}`);
  }
}

// ============================================================================
// Utilities
// ============================================================================

class ConsoleUtils {
  static separator(char = "=", length = 80): string {
    return char.repeat(length);
  }

  static printSection(title: string, char = "="): void {
    console.log(this.separator(char));
    console.log(title);
    console.log(this.separator(char));
    console.log();
  }

  static printSubsection(title: string): void {
    console.log(title);
    console.log("-".repeat(80));
  }
}

class InputHandler {
  static async prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  static async getTaskInput(): Promise<{
    title: string;
    description?: string;
    url?: string;
  }> {
    const title =
      process.env.TEST_TASK_TITLE || (await this.prompt("Enter task title: "));
    if (!title) {
      throw new Error("Task title is required");
    }

    const description =
      process.env.TEST_TASK_DESCRIPTION ||
      (await this.prompt(
        "Enter task description (optional, press Enter to skip): ",
      )) ||
      undefined;

    const url =
      process.env.TEST_TASK_URL ||
      (await this.prompt("Enter task URL (optional, press Enter to skip): ")) ||
      undefined;

    return { title, description, url };
  }
}

class ProgressDisplay {
  static createCallback() {
    return async (progress: AgentProcessingProgress) => {
      const progressBar =
        "█".repeat(Math.floor(progress.progress / 5)) +
        "░".repeat(20 - Math.floor(progress.progress / 5));
      console.log(
        `\n[Progress] [${progressBar}] ${progress.progress}% - ${progress.stage}`,
      );
      console.log(`  Message: ${progress.message}`);
      if (progress.details) {
        console.log("  Details:", JSON.stringify(progress.details, null, 2));
      }
    };
  }
}

// ============================================================================
// Result Formatters
// ============================================================================

class ResultFormatter {
  static formatDuration(ms: number): string {
    return `${ms}ms (${(ms / 1000).toFixed(2)}s)`;
  }

  static formatAgentResult(
    name: string,
    icon: string,
    result: any,
    success: boolean,
  ): void {
    console.log(`\n${icon} ${name}:`);
    console.log(`  Success: ${success}`);
    if (!success && result?.error) {
      console.log(`  Error: ${result.error}`);
    }
  }

  static formatWebContent(result: AgentProcessingResult): void {
    if (!result.webContent) return;

    this.formatAgentResult(
      "Web Content Agent",
      "📥",
      result.webContent,
      result.webContent.success,
    );

    if (result.webContent.success) {
      console.log(`  URL: ${result.webContent.url}`);
      console.log(`  Title: ${result.webContent.title || "N/A"}`);
      const contentLength = result.webContent.textContent?.length || 0;
      console.log(`  Content Length: ${contentLength} chars`);
      console.log(`  Confidence: ${result.webContent.confidence || "N/A"}`);

      if (result.webContent.textContent && contentLength > 0) {
        const preview = result.webContent.textContent.substring(0, 500);
        const truncated = contentLength > 500;
        console.log(`  Content Preview: ${preview}${truncated ? "..." : ""}`);
      }
    }
  }

  static formatSummarization(result: AgentProcessingResult): void {
    if (!result.summarization) return;

    this.formatAgentResult(
      "Content Summarizer Agent",
      "📝",
      result.summarization,
      result.summarization.success,
    );

    if (result.summarization.success) {
      console.log(
        `  Summary Length: ${result.summarization.summary.length} chars`,
      );
      console.log(`  Word Count: ${result.summarization.wordCount || "N/A"}`);
      console.log(
        `  Key Points: ${result.summarization.keyPoints?.length || 0}`,
      );
      console.log(`  Confidence: ${result.summarization.confidence || "N/A"}`);
      console.log(
        `  Summary Preview: ${result.summarization.summary.substring(0, 200)}...`,
      );
    }
  }

  static formatTaskAnalysis(result: AgentProcessingResult): void {
    if (!result.taskAnalysis) return;

    this.formatAgentResult(
      "Task Analyzer Agent",
      "🔍",
      result.taskAnalysis,
      result.taskAnalysis.success,
    );

    if (result.taskAnalysis.success) {
      console.log(
        `  Suggested Title: ${result.taskAnalysis.suggestedTitle || "N/A"}`,
      );
      const descPreview =
        result.taskAnalysis.suggestedDescription?.substring(0, 100) || "N/A";
      console.log(`  Suggested Description: ${descPreview}...`);
      console.log(`  Context: ${result.taskAnalysis.context || "N/A"}`);
      console.log(`  Priority: ${result.taskAnalysis.priority || "N/A"}`);
      console.log(
        `  Tags: ${result.taskAnalysis.suggestedTags?.join(", ") || "N/A"}`,
      );
      console.log(
        `  Estimated Duration: ${result.taskAnalysis.estimatedDuration || "N/A"}`,
      );
      console.log(`  Confidence: ${result.taskAnalysis.confidence || "N/A"}`);
    }
  }

  static formatContextExtraction(result: AgentProcessingResult): void {
    if (!result.contextExtraction) return;

    this.formatAgentResult(
      "Context Extractor Agent",
      "🏷️",
      result.contextExtraction,
      result.contextExtraction.success,
    );

    if (result.contextExtraction.success) {
      console.log(`  Context: ${result.contextExtraction.context || "N/A"}`);
      console.log(
        `  Tags: ${result.contextExtraction.tags?.join(", ") || "N/A"}`,
      );
      const projectHints =
        result.contextExtraction.projectHints?.join(", ") || "N/A";
      console.log(`  Project Hints: ${projectHints}`);
      const estimatedDuration =
        result.contextExtraction.estimatedDuration || "N/A";
      console.log(`  Estimated Duration: ${estimatedDuration}`);
      console.log(
        `  Confidence: ${result.contextExtraction.confidence || "N/A"}`,
      );
    }
  }

  static formatActionExtraction(result: AgentProcessingResult): void {
    if (!result.actionExtraction) return;

    this.formatAgentResult(
      "Action Extractor Agent",
      "✅",
      result.actionExtraction,
      result.actionExtraction.success,
    );

    if (result.actionExtraction.success) {
      console.log(
        `  Total Actions: ${result.actionExtraction.totalActions || 0}`,
      );
      if (result.actionExtraction.actions) {
        result.actionExtraction.actions.forEach((action, idx) => {
          console.log(`    ${idx + 1}. ${action.description}`);
          if (action.priority)
            console.log(`       Priority: ${action.priority}`);
          if (action.estimatedDuration)
            console.log(`       Duration: ${action.estimatedDuration}`);
        });
      }
      console.log(
        `  Total Solutions: ${result.actionExtraction.totalSolutions || 0}`,
      );
      if (result.actionExtraction.solutions) {
        result.actionExtraction.solutions.forEach((solution, idx) => {
          console.log(`    Solution ${idx + 1}: ${solution.title}`);
          const solutionDesc = solution.description.substring(0, 100);
          console.log(`      ${solutionDesc}...`);
        });
      }
      console.log(
        `  Confidence: ${result.actionExtraction.confidence || "N/A"}`,
      );
    }
  }

  static formatTaskAssistant(result: AgentProcessingResult): void {
    if (!result.taskAssistant) return;

    this.formatAgentResult(
      "Task Assistant Agent",
      "🤖",
      result.taskAssistant,
      result.taskAssistant.success,
    );

    if (result.taskAssistant.success) {
      if (result.taskAssistant.clarificationQuestions?.length) {
        console.log(
          `  Clarification Questions: ${result.taskAssistant.clarificationQuestions.length}`,
        );
      }
      if (result.taskAssistant.structure) {
        console.log("  Structure:");
        console.log(`    Goal: ${result.taskAssistant.structure.goal}`);
        console.log(
          `    Requirements: ${result.taskAssistant.structure.requirements.length}`,
        );
      }
      if (result.taskAssistant.implementation) {
        console.log("  Implementation:");
        console.log(
          `    Steps: ${result.taskAssistant.implementation.steps.length}`,
        );
        const resultPreview =
          result.taskAssistant.implementation.result.substring(0, 200);
        console.log(`    Result Preview: ${resultPreview}...`);
      }
      if (result.taskAssistant.qualityCheck) {
        console.log("  Quality Check:");
        console.log(
          `    Completeness: ${result.taskAssistant.qualityCheck.completeness}/10`,
        );
        console.log(
          `    Clarity: ${result.taskAssistant.qualityCheck.clarity}/10`,
        );
        console.log(
          `    Practicality: ${result.taskAssistant.qualityCheck.practicality}/10`,
        );
      }
      console.log(`  Confidence: ${result.taskAssistant.confidence || "N/A"}`);
    }
  }

  static formatAllResults(result: AgentProcessingResult): void {
    ConsoleUtils.printSubsection("Results Summary:");
    this.formatWebContent(result);
    this.formatSummarization(result);
    this.formatTaskAnalysis(result);
    this.formatContextExtraction(result);
    this.formatActionExtraction(result);
    this.formatTaskAssistant(result);

    if (result.errors && result.errors.length > 0) {
      console.log("\n❌ Errors:");
      result.errors.forEach((error) => {
        console.log(`  - ${error}`);
      });
    }
  }
}

class EnhancedTaskFormatter {
  static format(
    result: AgentProcessingResult,
    taskTitle: string,
    taskDescription?: string,
    taskUrl?: string,
  ): void {
    ConsoleUtils.printSection("Complete Task Information");

    console.log("📋 Original Task:");
    console.log(`  ID: ${result.taskId}`);
    console.log(`  Title: ${taskTitle}`);
    if (taskDescription) console.log(`  Description: ${taskDescription}`);
    if (taskUrl) console.log(`  URL: ${taskUrl}`);
    console.log();

    console.log("✨ Enhanced Task (with agent suggestions):");
    const enhancedTitle = result.taskAnalysis?.suggestedTitle || taskTitle;
    const enhancedDescription =
      result.taskAnalysis?.suggestedDescription ||
      result.summarization?.summary ||
      taskDescription ||
      "No description";

    console.log(`  Title: ${enhancedTitle}`);
    console.log("  Description:");
    for (const line of enhancedDescription.split("\n")) {
      console.log(`    ${line}`);
    }

    this.formatMetadata(result);
    this.formatWebContent(result, taskUrl);
    this.formatActions(result);
    this.formatSolutions(result);
    this.formatImplementation(result);
  }

  private static formatMetadata(result: AgentProcessingResult): void {
    if (result.taskAnalysis?.context) {
      console.log(`  Context: ${result.taskAnalysis.context}`);
    }
    if (result.contextExtraction?.context) {
      console.log(
        `  Context (from extractor): ${result.contextExtraction.context}`,
      );
    }

    const allTags = [
      ...(result.taskAnalysis?.suggestedTags || []),
      ...(result.contextExtraction?.tags || []),
    ];
    if (allTags.length > 0) {
      const uniqueTags = [...new Set(allTags)];
      console.log(`  Tags: ${uniqueTags.join(", ")}`);
    }

    if (result.taskAnalysis?.priority) {
      console.log(`  Priority: ${result.taskAnalysis.priority}`);
    }

    const taskEstimatedDuration =
      result.taskAnalysis?.estimatedDuration ||
      result.contextExtraction?.estimatedDuration;
    if (taskEstimatedDuration) {
      console.log(`  Estimated Duration: ${taskEstimatedDuration}`);
    }
  }

  private static formatWebContent(
    result: AgentProcessingResult,
    taskUrl?: string,
  ): void {
    if (!result.webContent?.success) return;

    if (result.webContent.title) {
      console.log(`  Web Content Title: ${result.webContent.title}`);
    }
    if (result.summarization?.success) {
      console.log("  Content Summary:");
      for (const line of result.summarization.summary.split("\n")) {
        console.log(`    ${line}`);
      }
    } else if (result.webContent.textContent) {
      const content = result.webContent.textContent;
      const previewLength = 1000;
      if (content.length <= previewLength) {
        console.log("  Web Content:");
        for (const line of content.split("\n").slice(0, 50)) {
          console.log(`    ${line}`);
        }
      } else {
        console.log(
          `  Web Content (${content.length} chars, showing first ${previewLength}):`,
        );
        const preview = content.substring(0, previewLength);
        for (const line of preview.split("\n").slice(0, 50)) {
          console.log(`    ${line}`);
        }
        console.log(
          `    ... [${content.length - previewLength} more characters]`,
        );
      }
    }
  }

  private static formatActions(result: AgentProcessingResult): void {
    if (
      !result.actionExtraction?.success ||
      !result.actionExtraction.actions ||
      result.actionExtraction.actions.length === 0
    ) {
      return;
    }

    console.log(`  Actions (${result.actionExtraction.actions.length}):`);
    for (let idx = 0; idx < result.actionExtraction.actions.length; idx++) {
      const action = result.actionExtraction.actions[idx];
      console.log(`    ${idx + 1}. ${action.description}`);
      if (action.priority) {
        console.log(`       Priority: ${action.priority}`);
      }
      if (action.estimatedDuration) {
        console.log(`       Duration: ${action.estimatedDuration}`);
      }
    }
  }

  private static formatSolutions(result: AgentProcessingResult): void {
    if (
      !result.actionExtraction?.solutions ||
      result.actionExtraction.solutions.length === 0
    ) {
      return;
    }

    console.log(`  Solutions (${result.actionExtraction.solutions.length}):`);
    for (let idx = 0; idx < result.actionExtraction.solutions.length; idx++) {
      const solution = result.actionExtraction.solutions[idx];
      console.log(`    ${idx + 1}. ${solution.title}`);
      console.log(`       ${solution.description}`);
      if (solution.approach) {
        console.log(`       Approach: ${solution.approach}`);
      }
      if (solution.steps && solution.steps.length > 0) {
        console.log("       Steps:");
        for (let stepIdx = 0; stepIdx < solution.steps.length; stepIdx++) {
          const step = solution.steps[stepIdx];
          console.log(`         ${stepIdx + 1}. ${step}`);
        }
      }
    }
  }

  private static formatImplementation(result: AgentProcessingResult): void {
    if (!result.taskAssistant?.implementation) return;

    console.log("  Implementation:");
    console.log("    Result:");
    for (const line of result.taskAssistant.implementation.result.split("\n")) {
      console.log(`      ${line}`);
    }
    if (result.taskAssistant.implementation.steps.length > 0) {
      console.log("    Steps:");
      for (
        let stepIdx = 0;
        stepIdx < result.taskAssistant.implementation.steps.length;
        stepIdx++
      ) {
        const step = result.taskAssistant.implementation.steps[stepIdx];
        console.log(`      ${stepIdx + 1}. ${step}`);
      }
    }
  }
}

class FinalResultFormatter {
  static format(
    result: AgentProcessingResult,
    taskTitle: string,
    taskDescription?: string,
  ): void {
    ConsoleUtils.printSection("Final Task Result (as displayed in UI)");

    const finalTitle = result.taskAnalysis?.suggestedTitle || taskTitle;
    console.log(`📋 ${finalTitle}`);
    console.log();

    const finalDescription =
      result.taskAnalysis?.suggestedDescription ||
      result.summarization?.summary ||
      taskDescription ||
      "";
    if (finalDescription) {
      console.log("Description:");
      for (const line of finalDescription.split("\n")) {
        console.log(`  ${line}`);
      }
      console.log();
    }

    this.formatMetadata(result);
    this.formatActions(result);
    this.formatSolutions(result);
    this.formatImplementation(result);
    this.formatWebContent(result);
    this.formatQualityCheck(result);
    this.formatClarificationQuestions(result);
  }

  private static formatMetadata(result: AgentProcessingResult): void {
    const metadata: string[] = [];

    if (result.taskAnalysis?.priority) {
      metadata.push(`Priority: ${result.taskAnalysis.priority}`);
    }

    const estimatedDuration =
      result.taskAnalysis?.estimatedDuration ||
      result.contextExtraction?.estimatedDuration;
    if (estimatedDuration) {
      metadata.push(`Estimated Duration: ${estimatedDuration}`);
    }

    if (result.taskAnalysis?.context) {
      metadata.push(`Context: ${result.taskAnalysis.context}`);
    } else if (result.contextExtraction?.context) {
      metadata.push(`Context: ${result.contextExtraction.context}`);
    }

    const finalAllTags = [
      ...(result.taskAnalysis?.suggestedTags || []),
      ...(result.contextExtraction?.tags || []),
    ];
    if (finalAllTags.length > 0) {
      const uniqueTags = [...new Set(finalAllTags)];
      metadata.push(`Tags: ${uniqueTags.join(", ")}`);
    }

    if (metadata.length > 0) {
      console.log("Metadata:");
      for (const meta of metadata) {
        console.log(`  • ${meta}`);
      }
      console.log();
    }
  }

  private static formatActions(result: AgentProcessingResult): void {
    if (
      !result.actionExtraction?.success ||
      !result.actionExtraction.actions ||
      result.actionExtraction.actions.length === 0
    ) {
      return;
    }

    console.log(`Actions (${result.actionExtraction.actions.length}):`);
    result.actionExtraction.actions.forEach((action, idx) => {
      console.log(`  ${idx + 1}. ${action.description}`);
      if (action.priority) {
        console.log(`     Priority: ${action.priority}`);
      }
      if (action.estimatedDuration) {
        console.log(`     Duration: ${action.estimatedDuration}`);
      }
    });
    console.log();
  }

  private static formatSolutions(result: AgentProcessingResult): void {
    if (
      !result.actionExtraction?.solutions ||
      result.actionExtraction.solutions.length === 0
    ) {
      return;
    }

    console.log(`Solutions (${result.actionExtraction.solutions.length}):`);
    result.actionExtraction.solutions.forEach((solution, idx) => {
      console.log(`  ${idx + 1}. ${solution.title}`);
      if (solution.description) {
        const descLines = solution.description.split("\n");
        descLines.forEach((line) => {
          console.log(`     ${line}`);
        });
      }
      if (solution.steps && solution.steps.length > 0) {
        console.log("     Steps:");
        solution.steps.forEach((step, stepIdx) => {
          console.log(`       ${stepIdx + 1}. ${step}`);
        });
      }
    });
    console.log();
  }

  private static formatImplementation(result: AgentProcessingResult): void {
    if (!result.taskAssistant?.implementation) return;

    console.log("Implementation:");
    const implLines = result.taskAssistant.implementation.result.split("\n");
    implLines.forEach((line) => {
      console.log(`  ${line}`);
    });
    if (result.taskAssistant.implementation.steps.length > 0) {
      console.log();
      console.log("Steps:");
      result.taskAssistant.implementation.steps.forEach((step, stepIdx) => {
        console.log(`  ${stepIdx + 1}. ${step}`);
      });
    }
    console.log();
  }

  private static formatWebContent(result: AgentProcessingResult): void {
    if (!result.webContent?.success) return;

    console.log("Web Content:");
    console.log(`  Source: ${result.webContent.url}`);
    if (result.webContent.title) {
      console.log(`  Title: ${result.webContent.title}`);
    }

    if (result.summarization?.success) {
      console.log("  Summary:");
      const summaryLines = result.summarization.summary.split("\n");
      summaryLines.forEach((line) => {
        console.log(`    ${line}`);
      });
      console.log();
    } else if (result.webContent.textContent) {
      const content = result.webContent.textContent;
      const maxDisplayLength = 8000;

      if (content.length <= maxDisplayLength) {
        console.log("  Content:");
        const contentLines = content.split("\n");
        contentLines.forEach((line) => {
          console.log(`    ${line}`);
        });
      } else {
        console.log(
          `  Content (${content.length} characters, showing first ${maxDisplayLength}):`,
        );
        const preview = content.substring(0, maxDisplayLength);
        const previewLines = preview.split("\n");
        previewLines.forEach((line) => {
          console.log(`    ${line}`);
        });
        console.log(
          `    ... [Content truncated - ${content.length - maxDisplayLength} more characters available]`,
        );
      }
      console.log();
    }
  }

  private static formatQualityCheck(result: AgentProcessingResult): void {
    if (!result.taskAssistant?.qualityCheck) return;

    console.log("Quality Assessment:");
    console.log(
      `  Completeness: ${result.taskAssistant.qualityCheck.completeness}/10`,
    );
    console.log(`  Clarity: ${result.taskAssistant.qualityCheck.clarity}/10`);
    console.log(
      `  Practicality: ${result.taskAssistant.qualityCheck.practicality}/10`,
    );
    console.log();
  }

  private static formatClarificationQuestions(
    result: AgentProcessingResult,
  ): void {
    if (
      !result.taskAssistant?.clarificationQuestions ||
      result.taskAssistant.clarificationQuestions.length === 0
    ) {
      return;
    }

    console.log("Clarification Questions:");
    result.taskAssistant.clarificationQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q}`);
    });
    console.log();
  }
}

// ============================================================================
// Initialization & Configuration
// ============================================================================

class AgentInitializer {
  static async checkOllamaConnection(
    endpoint: string,
    model: string,
  ): Promise<void> {
    try {
      const { Ollama } = await import("ollama");
      const ollama = new Ollama({ host: endpoint });
      const models = await ollama.list();
      console.log("✓ Connected to Ollama");
      console.log(
        `  Available models: ${models.models.map((m: any) => m.name).join(", ")}`,
      );
      if (!models.models.some((m: any) => m.name === model)) {
        console.warn(
          `⚠️  Model ${model} not found. It will be pulled on first use.`,
        );
      }
      console.log();
    } catch (error) {
      console.error("✗ Failed to connect to Ollama:", error);
      console.error("  Make sure Ollama is running at", endpoint);
      throw error;
    }
  }

  static initializeAgents(config: ConfigService) {
    console.log("Initializing agents...");
    const agents = {
      webContent: new WebContentAgent(config),
      contentSummarizer: new ContentSummarizerAgent(config),
      taskAnalyzer: new TaskAnalyzerAgent(config),
      contextExtractor: new ContextExtractorAgent(config),
      actionExtractor: new ActionExtractorAgent(config),
      agentSelector: new AgentSelectorAgent(config),
      taskAssistant: new TaskAssistantAgent(config),
    };
    console.log("✓ All agents initialized");
    console.log();
    return agents;
  }

  static createOrchestrator(
    taskTitle: string,
    taskDescription: string | undefined,
    taskUrl: string | undefined,
    agents: ReturnType<typeof this.initializeAgents>,
  ): AgentOrchestrator {
    const prisma = new MockPrismaService(
      taskTitle,
      taskDescription,
      taskUrl,
    ) as unknown as PrismaService;
    const eventBus = new MockEventBus();

    return new AgentOrchestrator(
      prisma,
      eventBus as any,
      agents.webContent,
      agents.contentSummarizer,
      agents.taskAnalyzer,
      agents.contextExtractor,
      agents.actionExtractor,
      agents.agentSelector,
      agents.taskAssistant,
    );
  }
}

// ============================================================================
// Main Test Function
// ============================================================================

async function testAgents(): Promise<void> {
  ConsoleUtils.printSection("Worker Agents Test Script");

  // Initialize configuration
  const config = new MockConfigService();
  const llmEndpoint = config.get("LLM_ENDPOINT", "http://localhost:11434");
  const llmModel = config.get("LLM_MODEL", "gemma3:1b");

  console.log("Configuration:");
  console.log(`  LLM Endpoint: ${llmEndpoint}`);
  console.log(`  LLM Model: ${llmModel}`);
  console.log();

  // Check Ollama connection
  await AgentInitializer.checkOllamaConnection(llmEndpoint, llmModel);

  // Initialize agents
  const agents = AgentInitializer.initializeAgents(config);

  // Get task input
  const { title, description, url } = await InputHandler.getTaskInput();

  // Test task ID
  const testTaskId = process.env.TEST_TASK_ID || TaskId.generate().value;

  console.log("Test Configuration:");
  console.log(`  Task ID: ${testTaskId}`);
  console.log(`  Task Title: ${title}`);
  if (description) console.log(`  Task Description: ${description}`);
  if (url) console.log(`  Task URL: ${url}`);
  console.log();

  // Create orchestrator
  const orchestrator = AgentInitializer.createOrchestrator(
    title,
    description,
    url,
    agents,
  );

  // Run the test
  console.log("Starting agent processing...");
  ConsoleUtils.printSubsection("");
  console.log();

  const startTime = Date.now();

  try {
    const result = await orchestrator.processTask(testTaskId, {
      onProgress: ProgressDisplay.createCallback(),
    });

    const processingDuration = Date.now() - startTime;

    ConsoleUtils.printSection("Processing Complete");
    console.log(
      `Duration: ${ResultFormatter.formatDuration(processingDuration)}`,
    );
    console.log();

    // Format and display results
    ResultFormatter.formatAllResults(result);
    EnhancedTaskFormatter.format(result, title, description, url);
    FinalResultFormatter.format(result, title, description);

    ConsoleUtils.printSection("✓ Processing completed successfully!");
    console.log(`Duration: ${(processingDuration / 1000).toFixed(2)}s`);
    console.log(ConsoleUtils.separator());

    process.exit(0);
  } catch (error) {
    console.error();
    ConsoleUtils.printSection("Test Failed", "=");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testAgents().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
