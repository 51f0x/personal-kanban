import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { ColumnController } from './column.controller';
import { ColumnService } from './column.service';
import { WipService } from './wip.service';

@Module({
    imports: [DatabaseModule, RealtimeModule],
    controllers: [BoardController, ColumnController],
    providers: [BoardService, ColumnService, WipService],
    exports: [BoardService, ColumnService, WipService],
})
export class BoardModule {}
