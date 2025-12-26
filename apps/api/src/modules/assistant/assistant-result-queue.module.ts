import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AssistantResultProcessor } from "./assistant-result.processor";
import { AssistantResultQueueService } from "./assistant-result-queue.service";

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
      name: "assistant-results",
    }),
  ],
  providers: [AssistantResultQueueService, AssistantResultProcessor],
  exports: [AssistantResultQueueService],
})
export class AssistantResultQueueModule {}

