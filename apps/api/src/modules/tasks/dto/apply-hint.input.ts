import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyHintDto {
    @ApiPropertyOptional({
        description: 'If true, mark hint as applied without actually applying it',
        example: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    dismiss?: boolean; // If true, mark as applied without actually applying
}
