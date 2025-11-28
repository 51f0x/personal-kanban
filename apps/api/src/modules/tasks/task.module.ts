import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BoardModule } from '../boards/board.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';

@Module({
  imports: [DatabaseModule, RealtimeModule, forwardRef(() => BoardModule)],
  controllers: [TaskController, ChecklistController],
  providers: [TaskService, ChecklistService],
  exports: [TaskService, ChecklistService],
})
export class TaskModule {}
