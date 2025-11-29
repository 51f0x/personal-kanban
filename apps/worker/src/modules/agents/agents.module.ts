import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { ConfigModule } from '../../shared/config.module';
import { AgentOrchestrator } from './agent-orchestrator.service';
import { AgentSelectorAgent } from './agent-selector.agent';
import { WebContentAgent } from './web-content.agent';
import { ContentSummarizerAgent } from './content-summarizer.agent';
import { TaskAnalyzerAgent } from './task-analyzer.agent';
import { ContextExtractorAgent } from './context-extractor.agent';
import { ActionExtractorAgent } from './action-extractor.agent';
import { TaskProcessorService } from './task-processor.service';
import { HintService } from './hint.service';
import { AgentJobProcessor } from './agent-job.processor';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
        return {
          connection: {
            url: redisUrl,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'agent-processing',
    }),
  ],
  providers: [
    AgentOrchestrator,
    AgentSelectorAgent,
    WebContentAgent,
    ContentSummarizerAgent,
    TaskAnalyzerAgent,
    ContextExtractorAgent,
    ActionExtractorAgent,
    TaskProcessorService,
    HintService,
    AgentJobProcessor,
  ],
  exports: [AgentOrchestrator, TaskProcessorService, HintService],
})
export class AgentsModule {}

