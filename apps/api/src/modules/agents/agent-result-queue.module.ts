import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AgentResultQueueService } from './agent-result-queue.service';
import { AgentResultProcessor } from './agent-result.processor';

@Module({
    imports: [
        BullModule.forRootAsync({
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
            name: 'agent-results',
        }),
    ],
    providers: [AgentResultQueueService, AgentResultProcessor],
    exports: [AgentResultQueueService],
})
export class AgentResultQueueModule {}
