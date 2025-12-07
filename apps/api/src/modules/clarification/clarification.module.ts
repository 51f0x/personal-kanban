import { Module } from '@nestjs/common';
import { DatabaseModule } from '@personal-kanban/shared';
import { RealtimeModule } from '../realtime/realtime.module';
import { ClarificationController } from './clarification.controller';
import { ClarificationService } from './clarification.service';

@Module({
  imports: [DatabaseModule, RealtimeModule],
  controllers: [ClarificationController],
  providers: [ClarificationService],
  exports: [ClarificationService],
})
export class ClarificationModule {}
