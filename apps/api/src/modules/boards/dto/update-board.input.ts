import { Prisma } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBoardDto {
    @ApiPropertyOptional({ description: 'Board name', example: 'My Personal Kanban' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({
        description: 'Board description',
        example: 'Personal task management board',
        nullable: true,
    })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({
        description: 'Board configuration as JSON',
        example: { theme: 'dark', notifications: true },
        nullable: true,
    })
    @IsOptional()
    config?: Prisma.JsonValue | null;
}
