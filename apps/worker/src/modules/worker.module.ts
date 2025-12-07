import { Module } from '@nestjs/common';
import { ConfigModule } from '../shared/config.module';
import { DatabaseModule } from '@personal-kanban/shared';
import { CaptureWorkerModule } from './capture/capture.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AgentsModule } from './agents/agents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventsModule } from './events/events.module';
import { InterContainerModule } from './inter-container/inter-container.module';

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
