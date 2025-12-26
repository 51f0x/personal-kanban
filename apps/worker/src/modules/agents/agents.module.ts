import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConfigModule } from "../../shared/config.module";
import { ActionExtractorAgent } from "./agents/action-extractor.agent";
import { AgentSelectorAgent } from "./agents/agent-selector.agent";
import { ContentSummarizerAgent } from "./agents/content-summarizer.agent";
import { ContextExtractorAgent } from "./agents/context-extractor.agent";
// TODO: DELETE ASAP - SolutionProposerAgent and TaskHelpAgent are unused
// import { SolutionProposerAgent } from "./agents/solution-proposer.agent";
import { TaskAnalyzerAgent } from "./agents/task-analyzer.agent";
import { TaskAssistantAgent } from "./agents/task-assistant.agent";
// TODO: DELETE ASAP - SolutionProposerAgent and TaskHelpAgent are unused
// import { TaskHelpAgent } from "./agents/task-help.agent";
import { ToMarkdownAgent } from "./agents/to-markdown.agent";
import { WebContentAgent } from "./agents/web-content.agent";
import { AgentApplicationService } from "./services/agent-application.service";
import { AgentOrchestrator } from "./services/agent-orchestrator.service";
import { AgentResultSenderService } from "./services/agent-result-sender.service";
import { HintService } from "./services/hint.service";
import { TaskProcessorService } from "./services/task-processor.service";
import { AgentJobProcessor } from "./processors/agent-job.processor";

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          "REDIS_URL",
          "redis://localhost:6379",
        );
        return {
          connection: {
            url: redisUrl,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: "agent-processing",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    }),
    BullModule.registerQueue({
      name: "agent-results",
      defaultJobOptions: {
        attempts: 1, // Results are idempotent, no need to retry
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    }),
  ],
  providers: [
    AgentOrchestrator,
    AgentApplicationService,
    AgentSelectorAgent,
    WebContentAgent,
    ContentSummarizerAgent,
    TaskAnalyzerAgent,
    ContextExtractorAgent,
    ActionExtractorAgent,
    ToMarkdownAgent,
    // TODO: DELETE ASAP - TaskHelpAgent and SolutionProposerAgent are unused
    // TaskHelpAgent,
    TaskAssistantAgent,
    // TODO: DELETE ASAP - TaskHelpAgent and SolutionProposerAgent are unused
    // SolutionProposerAgent,
    TaskProcessorService,
    HintService,
    AgentJobProcessor,
    AgentResultSenderService,
  ],
  exports: [
    AgentOrchestrator,
    AgentApplicationService,
    TaskProcessorService,
    HintService,
  ],
})
export class AgentsModule {}
