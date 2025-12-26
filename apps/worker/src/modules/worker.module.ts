import { Module } from "@nestjs/common";
import { ConfigModule } from "../shared/config.module";
import { WorkerDatabaseModule } from "../shared/worker-database.module";
import { AgentsModule } from "./agents/agents.module";
import { AssistantModule } from "./assistant/assistant.module";
import { CaptureWorkerModule } from "./capture-worker/capture-worker.module";
import { EventsModule } from "./events/events.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { InterContainerModule } from "./inter-container/inter-container.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    ConfigModule,
    EventsModule, // Global module for event infrastructure
    InterContainerModule, // Inter-container queue communication
    WorkerDatabaseModule, // Worker-specific database module using WORKER_DATABASE_URL
    CaptureWorkerModule,
    IntegrationsModule,
    AgentsModule,
    AssistantModule,
    NotificationsModule,
  ],
})
export class WorkerModule {}
