import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [DatabaseModule, RealtimeModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
