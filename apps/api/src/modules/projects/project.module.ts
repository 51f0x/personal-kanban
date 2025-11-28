import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProjectService } from './project.service';

@Module({
  imports: [DatabaseModule],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
