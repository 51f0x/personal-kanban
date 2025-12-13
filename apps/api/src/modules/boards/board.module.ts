import { forwardRef, Module } from "@nestjs/common";
import { DatabaseModule } from "@personal-kanban/shared";

import { RealtimeModule } from "../realtime/realtime.module";
import { TaskModule } from "../tasks/task.module";
import {
  CreateBoardUseCase,
  DeleteBoardUseCase,
  UpdateBoardUseCase,
} from "./application/use-cases";
import { BoardController } from "./board.controller";
import { BoardService } from "./board.service";
import { ColumnController } from "./column.controller";
import { ColumnService } from "./column.service";
import { PrismaBoardRepository } from "./infrastructure/repositories/prisma-board.repository";
import { PrismaColumnRepository } from "./infrastructure/repositories/prisma-column.repository";
import { WipService } from "./wip.service";

@Module({
  imports: [DatabaseModule, RealtimeModule, forwardRef(() => TaskModule)],
  controllers: [BoardController, ColumnController],
  providers: [
    BoardService, // Keep for query methods
    ColumnService,
    WipService,
    // Use Cases
    CreateBoardUseCase,
    UpdateBoardUseCase,
    DeleteBoardUseCase,
    // Repositories
    {
      provide: "IBoardRepository",
      useClass: PrismaBoardRepository,
    },
    {
      provide: "IColumnRepository",
      useClass: PrismaColumnRepository,
    },
  ],
  exports: [
    BoardService,
    ColumnService,
    WipService,
    "IBoardRepository",
    "IColumnRepository",
  ],
})
export class BoardModule {}
