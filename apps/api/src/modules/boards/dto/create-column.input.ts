import { ColumnType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateColumnDto {
    @ApiProperty({
        description: 'Board ID (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID('4')
    boardId: string;

    @ApiProperty({ description: 'Column name', example: 'In Progress' })
    @IsString()
    name: string;

    @ApiPropertyOptional({
        description: 'Column type',
        enum: ColumnType,
        example: ColumnType.CONTEXT,
    })
    @IsOptional()
    @IsEnum(ColumnType)
    type?: ColumnType;

    @ApiPropertyOptional({
        description: 'Work-in-progress limit (null for unlimited)',
        example: 5,
        minimum: 0,
        nullable: true,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    wipLimit?: number | null;

    @ApiPropertyOptional({ description: 'Column position (0-based)', example: 0, minimum: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;
}
