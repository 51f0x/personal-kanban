import { Module } from '@nestjs/common';
import { ConfigModule } from '../../shared/config.module';
import { DatabaseModule } from '../database/database.module';
import { TaskModule } from '../tasks/task.module';
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';

@Module({
  imports: [ConfigModule, DatabaseModule, TaskModule],
  controllers: [CaptureController],
  providers: [CaptureService],
  exports: [CaptureService],
})
export class CaptureModule {}
