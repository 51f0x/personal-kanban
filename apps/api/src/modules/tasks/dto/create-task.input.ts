import { Prisma, TaskContext } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChecklistItemDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @IsOptional()
  position?: number;
}

export class CreateTaskDto {
  @IsUUID('4')
  boardId!: string;

  @IsUUID('4')
  columnId!: string;

  @IsUUID('4')
  ownerId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @IsOptional()
  @IsEnum(TaskContext)
  context?: TaskContext;

  @IsOptional()
  @IsString()
  waitingFor?: string;

  @IsOptional()
  @Type(() => Date)
  dueAt?: Date;

  @IsOptional()
  @IsBoolean()
  needsBreakdown?: boolean;

  @IsOptional()
  metadata?: Prisma.JsonValue;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tags?: string[];
}
