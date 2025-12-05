import { Prisma } from '@prisma/client';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBoardDto {
    @ApiProperty({
        description: 'Owner user ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174002',
    })
    @IsUUID('4')
    ownerId!: string;

    @ApiProperty({ description: 'Board name', example: 'My Personal Kanban' })
    @IsString()
    name!: string;

    @ApiPropertyOptional({
        description: 'Board description',
        example: 'Personal task management board',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Board configuration as JSON',
        example: { theme: 'dark', notifications: true },
    })
    @IsOptional()
    config?: Prisma.JsonValue;
}
