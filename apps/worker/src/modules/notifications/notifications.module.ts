import { Module } from '@nestjs/common';
import { DatabaseModule } from '@personal-kanban/shared';
import { InterContainerModule } from '../inter-container/inter-container.module';
import { EmailService } from './email.service';
import { TaskPrioritizerService } from './task-prioritizer.service';
import { EmailReminderWorker } from './email-reminder.worker';

@Module({
    imports: [DatabaseModule, InterContainerModule],
    providers: [EmailService, TaskPrioritizerService, EmailReminderWorker],
    exports: [EmailService, TaskPrioritizerService],
})
export class NotificationsModule {}
