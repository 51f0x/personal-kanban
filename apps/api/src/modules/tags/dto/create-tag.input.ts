import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, Matches } from "class-validator";

export class CreateTagDto {
  @ApiProperty({
    description: "Board ID (UUID)",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID("4")
  boardId: string;

  @ApiProperty({ description: "Tag name", example: "urgent" })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Tag color in hex format",
    example: "#ff5500",
    pattern: "^#[0-9A-Fa-f]{6}$",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "Color must be a valid hex color (e.g., #ff5500)",
  })
  color?: string;
}
