import { Module } from "@nestjs/common";
import { DatabaseModule } from "@personal-kanban/shared";

import { HealthController } from "../presentation/health.controller";
import { ConfigModule } from "../shared/config.module";
import { AssistantModule } from "./assistant/assistant.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuthModule } from "./auth/auth.module";
import { BoardModule } from "./boards/board.module";
import { CaptureApiModule } from "./capture/capture.module";
import { ClarificationModule } from "./clarification/clarification.module";
import { EmailActionsModule } from "./email-actions/email-actions.module";
import { EventsModule } from "./events/events.module";
import { InterContainerModule } from "./inter-container/inter-container.module";
import { LlmModule } from "./llm/llm.module";
import { ProjectModule } from "./projects/project.module";
import { RateLimitModule } from "./rate-limit/rate-limit.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { RuleModule } from "./rules/rule.module";
import { TagModule } from "./tags/tag.module";
import { TaskModule } from "./tasks/task.module";
import { TemplateModule } from "./templates/template.module";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RateLimitModule,
    EventsModule, // Global module for event infrastructure
    InterContainerModule, // Inter-container queue communication
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
    CaptureApiModule,
    LlmModule,
    AssistantModule,
    EmailActionsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
