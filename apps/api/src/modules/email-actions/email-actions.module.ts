import { Module } from '@nestjs/common';
import { EmailActionsController } from './email-actions.controller';
import { EmailActionsService } from './email-actions.service';
import { DatabaseModule } from '@personal-kanban/shared';
import { TaskModule } from '../tasks/task.module';

@Module({
    imports: [DatabaseModule, TaskModule],
    controllers: [EmailActionsController],
    providers: [EmailActionsService],
    exports: [EmailActionsService],
})
export class EmailActionsModule {}
