import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateChecklistItemDto {
  @ApiProperty({
    description: "Checklist item title",
    example: "Review documentation",
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: "Whether the checklist item is completed",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @ApiPropertyOptional({
    description: "Position of the checklist item",
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateChecklistItemDto {
  @ApiPropertyOptional({
    description: "Checklist item title",
    example: "Review documentation",
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: "Whether the checklist item is completed",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @ApiPropertyOptional({
    description: "Position of the checklist item",
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class ReorderChecklistDto {
  @ApiProperty({
    description: "Array of checklist item IDs in the desired order",
    type: [String],
    example: ["item-id-1", "item-id-2"],
  })
  @IsString({ each: true })
  itemIds: string[];
}
