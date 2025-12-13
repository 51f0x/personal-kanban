import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class SetPasswordDto {
  @ApiProperty({
    description: "New password (minimum 8 characters)",
    example: "newPassword123",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
