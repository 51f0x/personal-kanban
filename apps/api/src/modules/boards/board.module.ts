import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BoardService } from './board.service';

@Module({
  imports: [DatabaseModule],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
