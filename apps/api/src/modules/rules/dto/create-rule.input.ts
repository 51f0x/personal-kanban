import {
    IsArray,
    IsBoolean,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Trigger configuration
 */
export class RuleTriggerDto {
    @ApiProperty({
        description: 'Trigger type',
        enum: [
            'task.created',
            'task.moved',
            'task.completed',
            'stale',
            'schedule',
            'email.received',
        ],
        example: 'task.created',
    })
    @IsString()
    type:
        | 'task.created'
        | 'task.moved'
        | 'task.completed'
        | 'stale'
        | 'schedule'
        | 'email.received';

    @ApiPropertyOptional({
        description: 'Trigger configuration',
        example: {
            schedule: '0 9 * * 1',
            staleThreshold: 7,
            fromColumn: 'column-id',
            toColumn: 'column-id',
        },
    })
    @IsOptional()
    @IsObject()
    config?: {
        schedule?: string; // cron or RRULE for schedule trigger
        staleThreshold?: number; // days for stale trigger
        fromColumn?: string; // for task.moved
        toColumn?: string; // for task.moved
    };
}

/**
 * Condition configuration
 */
export class RuleConditionDto {
    @ApiProperty({
        description: 'Field to check',
        example: 'title',
        enum: ['title', 'context', 'tags', 'project', 'age', 'dueIn', 'columnType'],
    })
    @IsString()
    field: string; // 'title', 'context', 'tags', 'project', 'age', 'dueIn', 'columnType'

    @ApiProperty({
        description: 'Comparison operator',
        enum: [
            'eq',
            'ne',
            'contains',
            'in',
            'notIn',
            'gt',
            'lt',
            'gte',
            'lte',
            'between',
            'exists',
            'notExists',
        ],
        example: 'contains',
    })
    @IsString()
    operator:
        | 'eq'
        | 'ne'
        | 'contains'
        | 'in'
        | 'notIn'
        | 'gt'
        | 'lt'
        | 'gte'
        | 'lte'
        | 'between'
        | 'exists'
        | 'notExists';

    @ApiProperty({ description: 'Value to compare against', example: 'urgent' })
    value: unknown;
}

/**
 * Action configuration
 */
export class RuleActionDto {
    @ApiProperty({
        description: 'Action type',
        enum: [
            'createTask',
            'updateTask',
            'moveTask',
            'addTag',
            'removeTag',
            'addChecklist',
            'notify',
            'stop',
        ],
        example: 'addTag',
    })
    @IsString()
    type:
        | 'createTask'
        | 'updateTask'
        | 'moveTask'
        | 'addTag'
        | 'removeTag'
        | 'addChecklist'
        | 'notify'
        | 'stop';

    @ApiProperty({ description: 'Action configuration', example: { tagId: 'tag-id-1' } })
    @IsObject()
    config: Record<string, unknown>;
}

export class CreateRuleDto {
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

    @ApiProperty({ description: 'Rule name', example: 'Auto-tag urgent tasks' })
    @IsString()
    name: string;

    @ApiPropertyOptional({
        description: 'Rule description',
        example: 'Automatically adds urgent tag to tasks with urgent in title',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Whether the rule is enabled',
        example: true,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @ApiPropertyOptional({
        description: 'Rule priority (higher numbers run first)',
        example: 0,
        minimum: 0,
        default: 0,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    priority?: number;

    @ApiProperty({ description: 'Rule trigger configuration', type: RuleTriggerDto })
    @ValidateNested()
    @Type(() => RuleTriggerDto)
    trigger: RuleTriggerDto;

    @ApiPropertyOptional({
        description: 'Rule conditions (all must be met)',
        type: [RuleConditionDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RuleConditionDto)
    conditions?: RuleConditionDto[];

    @ApiProperty({ description: 'Rule actions to execute', type: [RuleActionDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RuleActionDto)
    actions: RuleActionDto[];
}
