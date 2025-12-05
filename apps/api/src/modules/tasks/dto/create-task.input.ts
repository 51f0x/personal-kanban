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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChecklistItemDto {
    @ApiProperty({ description: 'Checklist item title', example: 'Review documentation' })
    @IsString()
    title!: string;

    @ApiPropertyOptional({
        description: 'Whether the checklist item is completed',
        example: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isDone?: boolean;

    @ApiPropertyOptional({ description: 'Position of the checklist item', example: 0, minimum: 0 })
    @IsOptional()
    position?: number;
}

export class CreateTaskDto {
    @ApiProperty({
        description: 'Board ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID('4')
    boardId!: string;

    @ApiProperty({
        description: 'Column ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    @IsUUID('4')
    columnId!: string;

    @ApiProperty({
        description: 'Owner user ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174002',
    })
    @IsUUID('4')
    ownerId!: string;

    @ApiProperty({ description: 'Task title', example: 'Complete project documentation' })
    @IsString()
    title!: string;

    @ApiPropertyOptional({
        description: 'Task description',
        example: 'Write comprehensive documentation for the API',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Project ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174003',
    })
    @IsOptional()
    @IsUUID('4')
    projectId?: string;

    @ApiPropertyOptional({
        description: 'Task context',
        enum: TaskContext,
        example: TaskContext.EMAIL,
    })
    @IsOptional()
    @IsEnum(TaskContext)
    context?: TaskContext;

    @ApiPropertyOptional({
        description: 'Who or what the task is waiting for',
        example: 'John from marketing team',
    })
    @IsOptional()
    @IsString()
    waitingFor?: string;

    @ApiPropertyOptional({
        description: 'Due date',
        example: '2024-12-31T23:59:59Z',
        type: 'string',
        format: 'date-time',
    })
    @IsOptional()
    @Type(() => Date)
    dueAt?: Date;

    @ApiPropertyOptional({
        description: 'Whether the task needs to be broken down into subtasks',
        example: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    needsBreakdown?: boolean;

    @ApiPropertyOptional({
        description: 'Additional metadata as JSON',
        example: { url: 'https://example.com', priority: 'high' },
    })
    @IsOptional()
    metadata?: Prisma.JsonValue;

    @ApiPropertyOptional({ description: 'Initial checklist items', type: [ChecklistItemDto] })
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ChecklistItemDto)
    checklist?: ChecklistItemDto[];

    @ApiPropertyOptional({
        description: 'Array of tag IDs (UUIDs)',
        type: [String],
        example: ['123e4567-e89b-12d3-a456-426614174004'],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    tags?: string[];
}
