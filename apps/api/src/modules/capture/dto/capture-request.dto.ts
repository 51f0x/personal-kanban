import { Prisma } from '@prisma/client';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CaptureRequestDto {
    @ApiProperty({
        description: 'Owner user ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174002',
    })
    @IsUUID('4')
    ownerId!: string;

    @ApiProperty({
        description: 'Board ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID('4')
    boardId!: string;

    @ApiPropertyOptional({
        description: 'Column ID (UUID) - if not provided, will use default Input column',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    @IsOptional()
    @IsUUID('4')
    columnId?: string;

    @ApiProperty({
        description: 'Task text to capture (max 2000 characters)',
        example: 'Review the quarterly report and provide feedback',
        maxLength: 2000,
    })
    @IsString()
    @MaxLength(2000)
    text!: string;

    @ApiPropertyOptional({
        description: 'Source of the capture (e.g., "email", "browser-extension", "mobile")',
        example: 'browser-extension',
    })
    @IsOptional()
    @IsString()
    source?: string;

    @ApiPropertyOptional({
        description: 'Additional metadata as JSON',
        example: { url: 'https://example.com', priority: 'high' },
    })
    @IsOptional()
    metadata?: Prisma.JsonValue;
}
