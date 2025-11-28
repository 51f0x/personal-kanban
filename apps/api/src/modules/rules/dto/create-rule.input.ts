import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Trigger configuration
 */
export class RuleTriggerDto {
  @IsString()
  type: 'task.created' | 'task.moved' | 'task.completed' | 'stale' | 'schedule' | 'email.received';

  @IsOptional()
  @IsObject()
  config?: {
    schedule?: string;      // cron or RRULE for schedule trigger
    staleThreshold?: number; // days for stale trigger
    fromColumn?: string;    // for task.moved
    toColumn?: string;      // for task.moved
  };
}

/**
 * Condition configuration
 */
export class RuleConditionDto {
  @IsString()
  field: string; // 'title', 'context', 'tags', 'project', 'age', 'dueIn', 'columnType'

  @IsString()
  operator: 'eq' | 'ne' | 'contains' | 'in' | 'notIn' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'exists' | 'notExists';

  value: unknown;
}

/**
 * Action configuration
 */
export class RuleActionDto {
  @IsString()
  type: 'createTask' | 'updateTask' | 'moveTask' | 'addTag' | 'removeTag' | 'addChecklist' | 'notify' | 'stop';

  @IsObject()
  config: Record<string, unknown>;
}

export class CreateRuleDto {
  @IsUUID('4')
  boardId: string;

  @IsUUID('4')
  ownerId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ValidateNested()
  @Type(() => RuleTriggerDto)
  trigger: RuleTriggerDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions?: RuleConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions: RuleActionDto[];
}
