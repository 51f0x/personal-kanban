import { Prisma } from '@prisma/client';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CaptureRequestDto {
  @IsUUID('4')
  ownerId!: string;

  @IsUUID('4')
  boardId!: string;

  @IsOptional()
  @IsUUID('4')
  columnId?: string;

  @IsString()
  @MaxLength(2000)
  text!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  metadata?: Prisma.JsonValue;
}
