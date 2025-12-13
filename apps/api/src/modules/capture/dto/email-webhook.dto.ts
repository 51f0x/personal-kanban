import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

// Common email webhook payload structure
// Supports formats from SendGrid, AWS SES, Mailgun, etc.
export class EmailAddressDto {
  @ApiProperty({ description: "Email address", example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: "Display name", example: "John Doe" })
  @IsOptional()
  @IsString()
  name?: string;
}

export class EmailAttachmentDto {
  @ApiProperty({ description: "Attachment filename", example: "document.pdf" })
  @IsString()
  filename!: string;

  @ApiProperty({
    description: "Attachment content type",
    example: "application/pdf",
  })
  @IsString()
  type!: string;

  @ApiProperty({
    description: "Attachment content (base64 encoded)",
    example: "base64content...",
  })
  @IsString()
  content!: string;
}

export class EmailWebhookDto {
  // Common fields across email webhook providers
  @ApiProperty({
    description: "Email subject",
    example: "New task: Review proposal",
  })
  @IsString()
  subject!: string;

  @ApiProperty({ description: "Email sender", type: EmailAddressDto })
  @ValidateNested()
  @Type(() => EmailAddressDto)
  from!: EmailAddressDto;

  @ApiPropertyOptional({
    description: "Email recipients",
    type: [EmailAddressDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  to?: EmailAddressDto[];

  @ApiPropertyOptional({
    description: "Plain text body",
    example: "This is the email body text",
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: "HTML body",
    example: "<p>This is the email body</p>",
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({
    description: "Email attachments",
    type: [EmailAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];

  @ApiPropertyOptional({
    description: "Additional metadata from webhook provider",
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
