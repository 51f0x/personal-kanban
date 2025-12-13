import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@personal-kanban/shared';
import { ConfigModule } from '../../shared/config.module';
import { ActionExtractorAgent } from './action-extractor.agent';
import { AgentApplicationService } from './agent-application.service';
import { AgentJobProcessor } from './agent-job.processor';
import { AgentOrchestrator } from './agent-orchestrator.service';
import { AgentResultSenderService } from './agent-result-sender.service';
import { AgentSelectorAgent } from './agent-selector.agent';
import { ContentSummarizerAgent } from './content-summarizer.agent';
import { ContextExtractorAgent } from './context-extractor.agent';
import { HintService } from './hint.service';
import { SolutionProposerAgent } from './solution-proposer.agent';
import { TaskAnalyzerAgent } from './task-analyzer.agent';
import { TaskHelpAgent } from './task-help.agent';
import { TaskProcessorService } from './task-processor.service';
import { ToMarkdownAgent } from './to-markdown.agent';
import { WebContentAgent } from './web-content.agent';

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
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
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
            name: 'agent-results',
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
        TaskHelpAgent,
        SolutionProposerAgent,
        TaskProcessorService,
        HintService,
        AgentJobProcessor,
        AgentResultSenderService,
    ],
    exports: [AgentOrchestrator, AgentApplicationService, TaskProcessorService, HintService],
})
export class AgentsModule {}
