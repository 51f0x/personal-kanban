import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from "class-validator";

export class MoveTaskDto {
  @ApiProperty({
    description: "Target column ID (UUID)",
    example: "123e4567-e89b-12d3-a456-426614174001",
  })
  @IsUUID("4")
  columnId: string;

  @ApiPropertyOptional({
    description: "Position in the target column (0-based)",
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    description: "Force move even if WIP limit would be exceeded",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceWipOverride?: boolean;
}

export interface MoveTaskResult {
  task: {
    id: string;
    title: string;
    columnId: string;
    boardId: string;
  };
  wipStatus: {
    columnId: string;
    columnName: string;
    currentCount: number;
    wipLimit: number | null;
    atLimit: boolean;
  };
  fromColumnId: string | null;
}
