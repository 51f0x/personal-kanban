import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BoardModule } from '../boards/board.module';
import { TagModule } from '../tags/tag.module';
import { LlmModule } from '../llm/llm.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';
import { HintsController } from './hints.controller';
import { HintsService } from './hints.service';

@Module({
  imports: [DatabaseModule, RealtimeModule, forwardRef(() => BoardModule), TagModule, LlmModule],
  controllers: [TaskController, ChecklistController, HintsController],
  providers: [TaskService, ChecklistService, HintsService],
  exports: [TaskService, ChecklistService, HintsService],
})
export class TaskModule {}
