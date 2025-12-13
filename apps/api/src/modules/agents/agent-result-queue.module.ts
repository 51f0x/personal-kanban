import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AgentResultProcessor } from "./agent-result.processor";
import { AgentResultQueueService } from "./agent-result-queue.service";

@Module({
  imports: [
    BullModule.forRootAsync({
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
      name: "agent-results",
    }),
  ],
  providers: [AgentResultQueueService, AgentResultProcessor],
  exports: [AgentResultQueueService],
})
export class AgentResultQueueModule {}
