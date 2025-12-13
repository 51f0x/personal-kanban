import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class RegisterUserDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: "User full name", example: "John Doe" })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    description: "User timezone (optional, defaults to UTC)",
    example: "America/New_York",
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: "User password (optional, minimum 8 characters if provided)",
    example: "password123",
    minLength: 8,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
