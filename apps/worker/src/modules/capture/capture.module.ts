import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { QuickTaskService } from './quick-task.service';

@Module({
  imports: [DatabaseModule],
  providers: [QuickTaskService],
  exports: [QuickTaskService],
})
export class CaptureModule {}
