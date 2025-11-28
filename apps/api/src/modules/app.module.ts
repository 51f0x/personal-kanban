import { Module } from '@nestjs/common';
import { HealthController } from '../presentation/health.controller';
import { ConfigModule } from '../shared/config.module';
import { BoardModule } from './boards/board.module';
import { DatabaseModule } from './database/database.module';
import { ProjectModule } from './projects/project.module';
import { TaskModule } from './tasks/task.module';

@Module({
  imports: [ConfigModule, DatabaseModule, BoardModule, TaskModule, ProjectModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
