import { ColumnType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateColumnDto {
  @IsUUID('4')
  boardId: string;

  @IsString()
  name: string;

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
