import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TemplatePayloadDto } from './create-template.input';

export class UpdateTemplateDto {
    @ApiPropertyOptional({ description: 'Template name', example: 'Weekly Team Meeting' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({
        description: 'Template description',
        example: 'Creates a weekly team meeting task every Friday',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Task payload to create when template executes',
        type: TemplatePayloadDto,
    })
    @IsOptional()
    @IsObject()
    payload?: TemplatePayloadDto;

    @ApiPropertyOptional({
        description: 'RRULE string or cron expression',
        example: 'FREQ=WEEKLY;BYDAY=FR;BYHOUR=14',
    })
    @IsOptional()
    @IsString()
    rrule?: string;

    @ApiPropertyOptional({ description: 'Timezone for the schedule', example: 'America/New_York' })
    @IsOptional()
    @IsString()
    timezone?: string;

    @ApiPropertyOptional({ description: 'Whether the template is active', example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
