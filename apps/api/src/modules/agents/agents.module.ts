import { Module } from "@nestjs/common";
import { DatabaseModule } from "@personal-kanban/shared";

import { RealtimeModule } from "../realtime/realtime.module";
import { AgentProgressController } from "./agent-progress.controller";
import { AgentProgressService } from "./agent-progress.service";
import { AgentQueueModule } from "./agent-queue.module";
import { AgentResultQueueModule } from "./agent-result-queue.module";
import { AgentsController } from "./agents.controller";

/**
 * Agent API Module (formerly AgentsModule)
 * Provides information endpoints about agent processing
 * Actual agent processing happens in the worker service via BullMQ
 */
@Module({
  imports: [
    DatabaseModule,
    RealtimeModule,
    AgentQueueModule,
    AgentResultQueueModule,
  ],
  controllers: [AgentsController, AgentProgressController],
  providers: [AgentProgressService],
  exports: [AgentProgressService, AgentQueueModule],
})
export class AgentApiModule {}
