import { ColumnType } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ColumnType)
  type?: ColumnType;

  @IsOptional()
  @IsInt()
  @Min(0)
  wipLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class ReorderColumnsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  columnIds: string[];
}
