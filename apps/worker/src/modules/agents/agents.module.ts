import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@personal-kanban/shared';
import { ConfigModule } from '../../shared/config.module';
import { AgentOrchestrator } from './agent-orchestrator.service';
import { AgentApplicationService } from './agent-application.service';
import { AgentSelectorAgent } from './agent-selector.agent';
import { WebContentAgent } from './web-content.agent';
import { ContentSummarizerAgent } from './content-summarizer.agent';
import { TaskAnalyzerAgent } from './task-analyzer.agent';
import { ContextExtractorAgent } from './context-extractor.agent';
import { ActionExtractorAgent } from './action-extractor.agent';
import { ToMarkdownAgent } from './to-markdown.agent';
import { TaskHelpAgent } from './task-help.agent';
import { TaskProcessorService } from './task-processor.service';
import { HintService } from './hint.service';
import { AgentJobProcessor } from './agent-job.processor';
import { AgentResultSenderService } from './agent-result-sender.service';

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
        BullModule.registerQueue({
            name: 'agent-results',
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
        TaskHelpAgent,
        TaskProcessorService,
        HintService,
        AgentJobProcessor,
        AgentResultSenderService,
    ],
    exports: [AgentOrchestrator, AgentApplicationService, TaskProcessorService, HintService],
})
export class AgentsModule {}
