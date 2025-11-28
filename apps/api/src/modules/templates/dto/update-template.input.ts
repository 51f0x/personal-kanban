import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { TemplatePayloadDto } from './create-template.input';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  payload?: TemplatePayloadDto;

  @IsOptional()
  @IsString()
  rrule?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
