import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class ApplyHintDto {
  @ApiPropertyOptional({
    description: "If true, mark hint as applied without actually applying it",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dismiss?: boolean; // If true, mark as applied without actually applying
}
