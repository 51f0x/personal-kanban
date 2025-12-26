import { Module } from '@nestjs/common';
import { InterContainerModule } from '../inter-container/inter-container.module';
import { EmailReminderWorker } from './email-reminder.worker';
import { EmailService } from './email.service';
import { TaskPrioritizerService } from './task-prioritizer.service';

@Module({
    imports: [InterContainerModule],
    providers: [EmailService, TaskPrioritizerService, EmailReminderWorker],
    exports: [EmailService, TaskPrioritizerService],
})
export class NotificationsModule {}
