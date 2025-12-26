import { Module } from "@nestjs/common";
import { DatabaseModule } from "@personal-kanban/shared";

import { RealtimeModule } from "../realtime/realtime.module";
import { AssistantProgressController } from "./assistant-progress.controller";
import { AssistantProgressService } from "./assistant-progress.service";
import { AssistantQueueModule } from "./assistant-queue.module";
import { AssistantResultQueueModule } from "./assistant-result-queue.module";
import { AssistantController } from "./assistant.controller";
import { AssistantCaptureService } from "./assistant-capture.service";

/**
 * Assistant API Module
 * Provides information endpoints about assistant processing
 * Actual assistant processing happens in the worker service via BullMQ
 */
@Module({
  imports: [
    DatabaseModule,
    RealtimeModule,
    AssistantQueueModule,
    AssistantResultQueueModule,
  ],
  controllers: [AssistantController, AssistantProgressController],
  providers: [AssistantProgressService, AssistantCaptureService],
  exports: [AssistantProgressService, AssistantCaptureService, AssistantQueueModule],
})
export class AssistantModule {}

