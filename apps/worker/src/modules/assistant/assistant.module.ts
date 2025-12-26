import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConfigModule } from "../../shared/config.module";
import { AnalystAgent } from "./agents/analyst.agent";
import { DecisionSupportAgent } from "./agents/decision-support.agent";
import { FinalAssemblerAgent } from "./agents/final-assembler.agent";
import { PrioritizerSchedulerAgent } from "./agents/prioritizer-scheduler.agent";
import { ResearchPlannerAgent } from "./agents/research-planner.agent";
import { TaskBreakdownAgent } from "./agents/task-breakdown.agent";
import { WebContentAgent } from "./agents/web-content.agent";
import { WebResearcherAgent } from "./agents/web-researcher.agent";
import { AssistantJobProcessor } from "./processors/assistant-job.processor";
import { AssistantOrchestrator } from "./services/assistant-orchestrator.service";
import { AssistantResultSenderService } from "./services/assistant-result-sender.service";
import { LocalBrainService } from "./services/local-brain.service";

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
      name: "assistant-processing",
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
      name: "assistant-results",
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
    LocalBrainService,
    WebContentAgent,
    AnalystAgent,
    TaskBreakdownAgent,
    ResearchPlannerAgent,
    WebResearcherAgent,
    PrioritizerSchedulerAgent,
    DecisionSupportAgent,
    FinalAssemblerAgent,
    AssistantOrchestrator,
    AssistantJobProcessor,
    AssistantResultSenderService,
  ],
  exports: [
    AssistantOrchestrator,
    AssistantResultSenderService,
  ],
})
export class AssistantModule {}

