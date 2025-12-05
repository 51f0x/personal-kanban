import { ColumnType } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateColumnDto {
    @ApiPropertyOptional({ description: 'Column name', example: 'In Progress' })
    @IsOptional()
    @IsString()
    name?: string;

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

export class ReorderColumnsDto {
    @ApiProperty({
        description: 'Array of column IDs in the desired order',
        type: [String],
        example: ['column-id-1', 'column-id-2'],
    })
    @IsArray()
    @IsUUID('4', { each: true })
    columnIds: string[];
}
