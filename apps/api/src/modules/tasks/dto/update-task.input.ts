import { Prisma, TaskContext } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskContext)
  context?: TaskContext | null;

  @IsOptional()
  @IsString()
  waitingFor?: string | null;

  @IsOptional()
  @Type(() => Date)
  dueAt?: Date | null;

  @IsOptional()
  @IsBoolean()
  needsBreakdown?: boolean;

  @IsOptional()
  metadata?: Prisma.JsonValue | null;

  @IsOptional()
  @IsUUID('4')
  projectId?: string | null;

  @IsOptional()
  @IsUUID('4')
  columnId?: string;

  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tags?: string[];
}
