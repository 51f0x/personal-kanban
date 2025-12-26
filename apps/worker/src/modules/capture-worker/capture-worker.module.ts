import { Module } from '@nestjs/common';
import { QuickTaskService } from './quick-task.service';

@Module({
    imports: [],
    providers: [QuickTaskService],
    exports: [QuickTaskService],
})
export class CaptureWorkerModule {}


