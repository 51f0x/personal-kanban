import { Module } from '@nestjs/common';
import { DatabaseModule } from '@personal-kanban/shared';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
