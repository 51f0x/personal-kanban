import { Module } from '@nestjs/common';
import { ConfigModule } from '../../shared/config.module';
import { DatabaseModule } from '@personal-kanban/shared';
import { TaskModule } from '../tasks/task.module';
import { AgentApiModule } from '../agents/agents.module';
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';
import { AgentCaptureService } from './agent-capture.service';
import { EmailCaptureService } from './email-capture.service';

@Module({
    imports: [ConfigModule, DatabaseModule, TaskModule, AgentApiModule],
    controllers: [CaptureController],
    providers: [CaptureService, AgentCaptureService, EmailCaptureService],
    exports: [CaptureService, EmailCaptureService],
})
export class CaptureApiModule {}
