import { IsBoolean, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Task payload that will be created when template executes
 */
export class TemplatePayloadDto {
    @ApiProperty({ description: 'Task title', example: 'Weekly team meeting' })
    @IsString()
    title: string;

    @ApiPropertyOptional({
        description: 'Task description',
        example: 'Review progress and plan next week',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Task context', example: 'MEETING' })
    @IsOptional()
    @IsString()
    context?: string;

    @ApiPropertyOptional({
        description: 'Column ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    @IsOptional()
    @IsString()
    columnId?: string;

    @ApiPropertyOptional({
        description: 'Project ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174003',
    })
    @IsOptional()
    @IsString()
    projectId?: string;

    @ApiPropertyOptional({ description: 'Whether the task needs breakdown', example: false })
    @IsOptional()
    @IsBoolean()
    needsBreakdown?: boolean;

    @ApiPropertyOptional({
        description: 'Checklist items',
        example: [{ title: 'Prepare agenda', isDone: false }],
    })
    @IsOptional()
    @IsObject()
    checklist?: Array<{ title: string; isDone?: boolean }>;

    @ApiPropertyOptional({
        description: 'Additional metadata',
        example: { meetingType: 'standup' },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

export class CreateTemplateDto {
    @ApiProperty({
        description: 'Board ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID('4')
    boardId: string;

    @ApiProperty({
        description: 'Owner user ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174002',
    })
    @IsUUID('4')
    ownerId: string;

    @ApiProperty({ description: 'Template name', example: 'Weekly Team Meeting' })
    @IsString()
    name: string;

    @ApiPropertyOptional({
        description: 'Template description',
        example: 'Creates a weekly team meeting task every Friday',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Task payload to create when template executes',
        type: TemplatePayloadDto,
    })
    @IsObject()
    payload: TemplatePayloadDto;

    @ApiProperty({
        description:
            'RRULE string (e.g., "FREQ=WEEKLY;BYDAY=FR;BYHOUR=14") or cron expression (e.g., "0 14 * * 5")',
        example: 'FREQ=WEEKLY;BYDAY=FR;BYHOUR=14',
    })
    @IsString()
    rrule: string;

    @ApiPropertyOptional({ description: 'Timezone for the schedule', example: 'America/New_York' })
    @IsOptional()
    @IsString()
    timezone?: string;

    @ApiPropertyOptional({
        description: 'Whether the template is active',
        example: true,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
