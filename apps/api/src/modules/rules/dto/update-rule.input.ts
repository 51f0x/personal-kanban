import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

import {
  RuleActionDto,
  RuleConditionDto,
  RuleTriggerDto,
} from "./create-rule.input";

export class UpdateRuleDto {
  @ApiPropertyOptional({
    description: "Rule name",
    example: "Auto-tag urgent tasks",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "Rule description",
    example: "Automatically adds urgent tag to tasks with urgent in title",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Whether the rule is enabled",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: "Rule priority (higher numbers run first)",
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({
    description: "Rule trigger configuration",
    type: RuleTriggerDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleTriggerDto)
  trigger?: RuleTriggerDto;

  @ApiPropertyOptional({
    description: "Rule conditions (all must be met)",
    type: [RuleConditionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions?: RuleConditionDto[];

  @ApiPropertyOptional({
    description: "Rule actions to execute",
    type: [RuleActionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions?: RuleActionDto[];
}
