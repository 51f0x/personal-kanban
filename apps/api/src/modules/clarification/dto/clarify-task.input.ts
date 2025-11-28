import { TaskContext } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClarifyTaskDto {
  /**
   * Step 1: Is this actionable?
   * If false, the task should go to Someday/Maybe, Reference, or Trash
   */
  @IsBoolean()
  actionable: boolean;

  /**
   * Step 2: Can it be done in less than 2 minutes?
   * If true and actionable, do it immediately (Done Immediately)
   */
  @IsOptional()
  @IsBoolean()
  twoMinute?: boolean;

  /**
   * Step 3: What's the next physical action?
   * Update the task title/description with a clear next action
   */
  @IsOptional()
  @IsString()
  nextAction?: string;

  /**
   * Step 4: Which context does this belong to?
   */
  @IsOptional()
  @IsEnum(TaskContext)
  context?: TaskContext;

  /**
   * Step 5: Link to a project?
   */
  @IsOptional()
  @IsUUID('4')
  projectId?: string | null;

  /**
   * Step 6: Waiting on someone?
   */
  @IsOptional()
  @IsString()
  waitingFor?: string | null;

  /**
   * Step 7: Due date?
   */
  @IsOptional()
  @Type(() => Date)
  dueAt?: Date | null;

  /**
   * Step 8: Needs breakdown into subtasks?
   */
  @IsOptional()
  @IsBoolean()
  needsBreakdown?: boolean;

  /**
   * Non-actionable routing: where should non-actionable items go?
   */
  @IsOptional()
  @IsString()
  nonActionableDestination?: 'someday' | 'archive' | 'delete';
}

export class ClarificationStatsDto {
  boardId: string;
  totalUnclarified: number;
  clarifiedToday: number;
  averageClarificationTimeSec: number;
}
