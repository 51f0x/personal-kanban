import { Module } from '@nestjs/common';
import { HealthController } from '../presentation/health.controller';
import { ConfigModule } from '../shared/config.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BoardModule } from './boards/board.module';
import { AuthModule } from './auth/auth.module';
import { CaptureModule } from './capture/capture.module';
import { ClarificationModule } from './clarification/clarification.module';
import { DatabaseModule } from './database/database.module';
import { ProjectModule } from './projects/project.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RuleModule } from './rules/rule.module';
import { TagModule } from './tags/tag.module';
import { TaskModule } from './tasks/task.module';
import { TemplateModule } from './templates/template.module';
import { LlmModule } from './llm/llm.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RateLimitModule,
    AuthModule,
    BoardModule,
    TaskModule,
    ProjectModule,
    TagModule,
    RuleModule,
    TemplateModule,
    AnalyticsModule,
    ClarificationModule,
    RealtimeModule,
    CaptureModule,
    LlmModule,
    AgentsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
