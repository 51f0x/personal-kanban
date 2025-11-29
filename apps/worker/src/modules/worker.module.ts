import { Module } from '@nestjs/common';
import { ConfigModule } from '../shared/config.module';
import { CaptureModule } from './capture/capture.module';
import { DatabaseModule } from './database/database.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [ConfigModule, DatabaseModule, CaptureModule, IntegrationsModule, AgentsModule],
})
export class WorkerModule {}
