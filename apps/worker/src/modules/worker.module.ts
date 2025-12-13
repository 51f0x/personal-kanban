import { Module } from '@nestjs/common';
import { DatabaseModule } from '@personal-kanban/shared';
import { ConfigModule } from '../shared/config.module';
import { AgentsModule } from './agents/agents.module';
import { CaptureWorkerModule } from './capture/capture.module';
import { EventsModule } from './events/events.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { InterContainerModule } from './inter-container/inter-container.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
    imports: [
        ConfigModule,
        EventsModule, // Global module for event infrastructure
        InterContainerModule, // Inter-container queue communication
        DatabaseModule,
        CaptureWorkerModule,
        IntegrationsModule,
        AgentsModule,
        NotificationsModule,
    ],
})
export class WorkerModule {}
