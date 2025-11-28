import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
