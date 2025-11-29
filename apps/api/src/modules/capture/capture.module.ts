import { Module } from '@nestjs/common';
import { ConfigModule } from '../../shared/config.module';
import { DatabaseModule } from '../database/database.module';
import { TaskModule } from '../tasks/task.module';
import { AgentsModule } from '../agents/agents.module';
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';
import { AgentCaptureService } from './agent-capture.service';

@Module({
  imports: [ConfigModule, DatabaseModule, TaskModule, AgentsModule],
  controllers: [CaptureController],
  providers: [CaptureService, AgentCaptureService],
  exports: [CaptureService],
})
export class CaptureModule {}
