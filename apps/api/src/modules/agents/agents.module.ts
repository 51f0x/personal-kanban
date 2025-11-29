import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AgentsController } from './agents.controller';
import { AgentProgressController } from './agent-progress.controller';
import { AgentProgressService } from './agent-progress.service';
import { AgentQueueModule } from './agent-queue.module';

/**
 * Agents Module
 * Provides information endpoints about agent processing
 * Actual agent processing happens in the worker service via BullMQ
 */
@Module({
  imports: [DatabaseModule, RealtimeModule, AgentQueueModule],
  controllers: [AgentsController, AgentProgressController],
  providers: [AgentProgressService],
  exports: [AgentProgressService, AgentQueueModule],
})
export class AgentsModule {}

