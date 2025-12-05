import { Prisma, TaskContext, TaskPriority } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto {
    @ApiPropertyOptional({ description: 'Task title', example: 'Complete project documentation' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({
        description: 'Task description',
        example: 'Write comprehensive documentation for the API',
        nullable: true,
    })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({
        description: 'Task context',
        enum: TaskContext,
        example: TaskContext.EMAIL,
        nullable: true,
    })
    @IsOptional()
    @IsEnum(TaskContext)
    context?: TaskContext | null;

    @ApiPropertyOptional({
        description: 'Who or what the task is waiting for',
        example: 'John from marketing team',
        nullable: true,
    })
    @IsOptional()
    @IsString()
    waitingFor?: string | null;

    @ApiPropertyOptional({
        description: 'Due date',
        example: '2024-12-31T23:59:59Z',
        type: 'string',
        format: 'date-time',
        nullable: true,
    })
    @IsOptional()
    @Type(() => Date)
    dueAt?: Date | null;

    @ApiPropertyOptional({
        description: 'Task priority',
        enum: TaskPriority,
        example: TaskPriority.MEDIUM,
        nullable: true,
    })
    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority | null;

    @ApiPropertyOptional({
        description: 'Estimated duration',
        example: '30 minutes',
        nullable: true,
    })
    @IsOptional()
    @IsString()
    duration?: string | null;

    @ApiPropertyOptional({
        description: 'Whether the task needs to be broken down into subtasks',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    needsBreakdown?: boolean;

    @ApiPropertyOptional({
        description: 'Additional metadata as JSON',
        example: { url: 'https://example.com', priority: 'high' },
        nullable: true,
    })
    @IsOptional()
    metadata?: Prisma.JsonValue | null;

    @ApiPropertyOptional({
        description: 'Project ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174003',
        nullable: true,
    })
    @IsOptional()
    @IsUUID('4')
    projectId?: string | null;

    @ApiPropertyOptional({
        description: 'Column ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    @IsOptional()
    @IsUUID('4')
    columnId?: string;

    @ApiPropertyOptional({ description: 'Whether the task is completed', example: false })
    @IsOptional()
    @IsBoolean()
    isDone?: boolean;

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
