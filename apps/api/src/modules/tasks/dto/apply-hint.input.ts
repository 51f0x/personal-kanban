import { IsOptional, IsBoolean } from 'class-validator';

export class ApplyHintDto {
  @IsOptional()
  @IsBoolean()
  dismiss?: boolean; // If true, mark as applied without actually applying
}

