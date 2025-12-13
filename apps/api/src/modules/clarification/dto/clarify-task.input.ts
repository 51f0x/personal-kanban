import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TaskContext } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class ClarifyTaskDto {
  @ApiProperty({
    description:
      "Step 1: Is this actionable? If false, the task should go to Someday/Maybe, Reference, or Trash",
    example: true,
  })
  @IsBoolean()
  actionable: boolean;

  @ApiPropertyOptional({
    description:
      "Step 2: Can it be done in less than 2 minutes? If true and actionable, do it immediately",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  twoMinute?: boolean;

  @ApiPropertyOptional({
    description:
      "Step 3: What's the next physical action? Update the task title/description with a clear next action",
    example: "Call John to schedule meeting",
  })
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional({
    description: "Step 4: Which context does this belong to?",
    enum: TaskContext,
    example: TaskContext.EMAIL,
  })
  @IsOptional()
  @IsEnum(TaskContext)
  context?: TaskContext;

  @ApiPropertyOptional({
    description: "Step 5: Link to a project?",
    example: "123e4567-e89b-12d3-a456-426614174003",
    nullable: true,
  })
  @IsOptional()
  @IsUUID("4")
  projectId?: string | null;

  @ApiPropertyOptional({
    description: "Step 6: Waiting on someone?",
    example: "John from marketing team",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  waitingFor?: string | null;

  @ApiPropertyOptional({
    description: "Step 7: Due date?",
    example: "2024-12-31T23:59:59Z",
    type: "string",
    format: "date-time",
    nullable: true,
  })
  @IsOptional()
  @Type(() => Date)
  dueAt?: Date | null;

  @ApiPropertyOptional({
    description: "Step 8: Needs breakdown into subtasks?",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  needsBreakdown?: boolean;

  @ApiPropertyOptional({
    description:
      "Non-actionable routing: where should non-actionable items go?",
    enum: ["someday", "archive", "delete"],
    example: "someday",
  })
  @IsOptional()
  @IsString()
  nonActionableDestination?: "someday" | "archive" | "delete";
}

export class ClarificationStatsDto {
  boardId: string;
  totalUnclarified: number;
  clarifiedToday: number;
  averageClarificationTimeSec: number;
}
