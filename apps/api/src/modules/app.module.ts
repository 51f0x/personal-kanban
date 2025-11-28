import { Module } from '@nestjs/common';
import { HealthController } from '../presentation/health.controller';
import { ConfigModule } from '../shared/config.module';
import { BoardModule } from './boards/board.module';
import { AuthModule } from './auth/auth.module';
import { CaptureModule } from './capture/capture.module';
import { DatabaseModule } from './database/database.module';
import { ProjectModule } from './projects/project.module';
import { RealtimeModule } from './realtime/realtime.module';
import { TaskModule } from './tasks/task.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    BoardModule,
    TaskModule,
    ProjectModule,
    RealtimeModule,
    CaptureModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
