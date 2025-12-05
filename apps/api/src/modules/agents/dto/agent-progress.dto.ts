import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AgentProcessingStage {
    INITIALIZING = 'initializing',
    DETECTING_URL = 'detecting-url',
    DOWNLOADING_CONTENT = 'downloading-content',
    EXTRACTING_TEXT = 'extracting-text',
    SUMMARIZING_CONTENT = 'summarizing-content',
    ANALYZING_TASK = 'analyzing-task',
    EXTRACTING_CONTEXT = 'extracting-context',
    EXTRACTING_ACTIONS = 'extracting-actions',
    APPLYING_RESULTS = 'applying-results',
    COMPLETED = 'completed',
    ERROR = 'error',
}

export class AgentProcessingProgressDetailsDto {
    @ApiPropertyOptional({
        description: 'URL being processed',
        example: 'https://example.com/article',
    })
    url?: string;

    @ApiPropertyOptional({ description: 'Content length in bytes', example: 50000 })
    contentLength?: number;

    @ApiPropertyOptional({ description: 'Summary length in characters', example: 500 })
    summaryLength?: number;

    @ApiPropertyOptional({ description: 'Agent ID', example: 'web-content-agent' })
    agentId?: string;

    @ApiPropertyOptional({
        description: 'Error message if any',
        example: 'Failed to download content',
    })
    error?: string;

    @ApiPropertyOptional({
        description: 'Board ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    boardId?: string;

    [key: string]: unknown;
}

export class AgentProcessingProgressDto {
    @ApiProperty({ description: 'Task ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174005' })
    taskId: string;

    @ApiProperty({
        description: 'Current processing stage',
        enum: AgentProcessingStage,
        example: AgentProcessingStage.DOWNLOADING_CONTENT,
    })
    stage: AgentProcessingStage;

    @ApiProperty({
        description: 'Progress percentage (0-100)',
        example: 45,
        minimum: 0,
        maximum: 100,
    })
    progress: number;

    @ApiProperty({ description: 'Progress message', example: 'Downloading content from URL...' })
    message: string;

    @ApiPropertyOptional({
        description: 'Additional progress details',
        type: AgentProcessingProgressDetailsDto,
    })
    details?: AgentProcessingProgressDetailsDto;

    @ApiProperty({
        description: 'Timestamp of the progress update',
        example: '2024-01-15T10:30:00Z',
        type: 'string',
        format: 'date-time',
    })
    timestamp: string;
}
