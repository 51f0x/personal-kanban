import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateTagDto {
  @IsUUID('4')
  boardId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color (e.g., #ff5500)' })
  color?: string;
}
