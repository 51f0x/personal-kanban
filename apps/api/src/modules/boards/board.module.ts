import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BoardController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
