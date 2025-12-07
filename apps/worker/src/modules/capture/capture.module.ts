import { Module } from '@nestjs/common';
import { DatabaseModule } from '@personal-kanban/shared';
import { QuickTaskService } from './quick-task.service';

@Module({
    imports: [DatabaseModule],
    providers: [QuickTaskService],
    exports: [QuickTaskService],
})
export class CaptureWorkerModule {}
