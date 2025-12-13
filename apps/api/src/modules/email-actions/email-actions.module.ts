import { Module } from "@nestjs/common";
import { DatabaseModule } from "@personal-kanban/shared";

import { TaskModule } from "../tasks/task.module";
import { EmailActionsController } from "./email-actions.controller";
import { EmailActionsService } from "./email-actions.service";

@Module({
  imports: [DatabaseModule, TaskModule],
  controllers: [EmailActionsController],
  providers: [EmailActionsService],
  exports: [EmailActionsService],
})
export class EmailActionsModule {}
