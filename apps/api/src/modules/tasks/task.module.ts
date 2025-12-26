import { forwardRef, Module } from "@nestjs/common";
import { DatabaseModule } from "@personal-kanban/shared";

import { AssistantModule } from "../assistant/assistant.module";
import { AgentQueueModule } from "../agents/agent-queue.module";
import { BoardModule } from "../boards/board.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { TagModule } from "../tags/tag.module";
import {
  CreateTaskUseCase,
  DeleteTaskUseCase,
  GetStaleTasksUseCase,
  MarkStaleUseCase,
  MoveTaskUseCase,
  UpdateTaskUseCase,
} from "./application/use-cases";
import { ChecklistController } from "./checklist.controller";
import { ChecklistService } from "./checklist.service";
import { HintsController } from "./hints.controller";
import { HintsService } from "./hints.service";
import { PrismaTaskRepository } from "./infrastructure/repositories/prisma-task.repository";
import { TaskController } from "./task.controller";
import { TaskService } from "./task.service";

@Module({
  imports: [
    DatabaseModule,
    RealtimeModule,
    forwardRef(() => BoardModule),
    TagModule,
    AgentQueueModule,
    AssistantModule,
  ],
  controllers: [TaskController, ChecklistController, HintsController],
  providers: [
    TaskService, // Keep for backward compatibility and query methods
    ChecklistService,
    HintsService,
    // Use Cases
    CreateTaskUseCase,
    UpdateTaskUseCase,
    MoveTaskUseCase,
    DeleteTaskUseCase,
    GetStaleTasksUseCase,
    MarkStaleUseCase,
    // Repositories
    {
      provide: "ITaskRepository",
      useClass: PrismaTaskRepository,
    },
  ],
  exports: [TaskService, ChecklistService, HintsService, "ITaskRepository"],
})
export class TaskModule {
  // IColumnRepository is imported from BoardModule via forwardRef
}
