import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateChecklistItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateChecklistItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class ReorderChecklistDto {
  @IsString({ each: true })
  itemIds: string[];
}
