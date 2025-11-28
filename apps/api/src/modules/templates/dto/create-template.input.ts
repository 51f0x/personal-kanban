import { IsBoolean, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Task payload that will be created when template executes
 */
export class TemplatePayloadDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  columnId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsBoolean()
  needsBreakdown?: boolean;

  @IsOptional()
  @IsObject()
  checklist?: Array<{ title: string; isDone?: boolean }>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateTemplateDto {
  @IsUUID('4')
  boardId: string;

  @IsUUID('4')
  ownerId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  payload: TemplatePayloadDto;

  /**
   * RRULE string (e.g., "FREQ=WEEKLY;BYDAY=FR;BYHOUR=14")
   * or cron expression (e.g., "0 14 * * 5")
   */
  @IsString()
  rrule: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
