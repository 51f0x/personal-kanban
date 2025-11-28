import { Module } from '@nestjs/common';
import { BoardGateway } from './board.gateway';

@Module({
  providers: [BoardGateway],
  exports: [BoardGateway],
})
export class RealtimeModule {}
