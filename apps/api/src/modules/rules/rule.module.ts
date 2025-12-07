import { Module } from '@nestjs/common';
import { DatabaseModule } from '@personal-kanban/shared';
import { RuleController } from './rule.controller';
import { RuleService } from './rule.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RuleController],
  providers: [RuleService],
  exports: [RuleService],
})
export class RuleModule {}
