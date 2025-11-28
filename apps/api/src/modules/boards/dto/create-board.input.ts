import { Prisma } from '@prisma/client';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBoardDto {
  @IsUUID('4')
  ownerId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  config?: Prisma.JsonValue;
}
