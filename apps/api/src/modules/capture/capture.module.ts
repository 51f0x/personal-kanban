import { Module } from "@nestjs/common";
import { DatabaseModule } from "@personal-kanban/shared";

import { ConfigModule } from "../../shared/config.module";
import { AgentApiModule } from "../agents/agents.module";
import { AssistantModule } from "../assistant/assistant.module";
import { TaskModule } from "../tasks/task.module";
import { CaptureController } from "./capture.controller";
import { CaptureService } from "./capture.service";
import { EmailCaptureService } from "./email-capture.service";

@Module({
  imports: [ConfigModule, DatabaseModule, TaskModule, AssistantModule, AgentApiModule],
  controllers: [CaptureController],
  providers: [CaptureService, EmailCaptureService],
  exports: [CaptureService, EmailCaptureService],
})
export class CaptureApiModule {}
