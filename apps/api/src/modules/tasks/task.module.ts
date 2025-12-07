import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@personal-kanban/shared';
import { RealtimeModule } from '../realtime/realtime.module';
import { BoardModule } from '../boards/board.module';
import { TagModule } from '../tags/tag.module';
import { AgentQueueModule } from '../agents/agent-queue.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';
import { HintsController } from './hints.controller';
import { HintsService } from './hints.service';
import { PrismaTaskRepository } from './infrastructure/repositories/prisma-task.repository';
import {
    CreateTaskUseCase,
    UpdateTaskUseCase,
    MoveTaskUseCase,
    DeleteTaskUseCase,
    GetStaleTasksUseCase,
    MarkStaleUseCase,
} from './application/use-cases';

@Module({
    imports: [
        DatabaseModule,
        RealtimeModule,
        forwardRef(() => BoardModule),
        TagModule,
        AgentQueueModule,
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
            provide: 'ITaskRepository',
            useClass: PrismaTaskRepository,
        },
    ],
    exports: [TaskService, ChecklistService, HintsService, 'ITaskRepository'],
})
export class TaskModule {
    // IColumnRepository is imported from BoardModule via forwardRef
}
