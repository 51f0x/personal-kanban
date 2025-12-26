import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AssistantQueueService } from "./assistant-queue.service";

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
      name: "assistant-processing",
    }),
  ],
  providers: [AssistantQueueService],
  exports: [AssistantQueueService],
})
export class AssistantQueueModule {}

