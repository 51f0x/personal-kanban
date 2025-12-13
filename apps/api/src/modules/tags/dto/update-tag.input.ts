import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches } from "class-validator";

export class UpdateTagDto {
  @ApiPropertyOptional({ description: "Tag name", example: "urgent" })
  @IsOptional()
  @IsString()
  name?: string;

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
