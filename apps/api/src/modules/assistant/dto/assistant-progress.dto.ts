import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import type { AssistantProcessingProgress } from "../types";

/**
 * Assistant processing progress DTO
 */
export class AssistantProgressDataDto implements AssistantProcessingProgress {
  @ApiProperty({ description: "Request ID" })
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({
    description: "Processing stage",
    enum: [
      "analysis",
      "local-brain-prep",
      "task-breakdown",
      "research-planning",
      "web-research",
      "prioritization",
      "decision-support",
      "final-assembly",
      "completed",
      "error",
    ],
  })
  @IsString()
  @IsNotEmpty()
  stage: AssistantProcessingProgress["stage"];

  @ApiProperty({ description: "Progress percentage (0-100)", minimum: 0, maximum: 100 })
  progress: number;

  @ApiProperty({ description: "Progress message" })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: "Additional progress details", required: false })
  @IsObject()
  details?: Record<string, unknown>;

  @ApiProperty({ description: "Timestamp" })
  @IsString()
  @IsNotEmpty()
  timestamp: string;
}

/**
 * Assistant progress update DTO
 */
export class AssistantProgressDto {
  @ApiProperty({ description: "Request ID" })
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({ description: "Board ID" })
  @IsString()
  @IsNotEmpty()
  boardId: string;

  @ApiProperty({ description: "Progress data", type: AssistantProgressDataDto })
  @ValidateNested()
  @Type(() => AssistantProgressDataDto)
  @IsObject()
  progress: AssistantProcessingProgress;
}

