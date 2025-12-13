import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import { parseCaptureText } from '@personal-kanban/shared';
import { Prisma } from '@prisma/client';

interface QuickTaskPayload {
    ownerId: string;
    boardId: string;
    columnId?: string;
    text: string;
    source?: string;
    metadata?: Prisma.JsonValue;
}

@Injectable()
export class QuickTaskService {
    private readonly logger = new Logger(QuickTaskService.name);

    constructor(private readonly prisma: PrismaService) {}

    async createFromCapture(payload: QuickTaskPayload) {
        const board = await this.prisma.board.findUnique({
            where: { id: payload.boardId },
            include: { columns: { orderBy: { position: 'asc' } } },
        });
        if (!board) {
            throw new Error('Board not found for capture');
        }

        const targetColumn = payload.columnId
            ? board.columns.find((column) => column.id === payload.columnId)
            : (board.columns.find((column) => column.type === 'INPUT') ?? board.columns[0]);

        if (!targetColumn) {
            throw new Error('No columns available for capture');
        }

        const parsed = parseCaptureText(payload.text);

        const result = await this.prisma.task.create({
            data: {
                boardId: payload.boardId,
                columnId: targetColumn.id,
                ownerId: payload.ownerId,
                title: parsed.title,
                description: parsed.description,
                metadata: {
                    ...parsed.metadata,
                    source: payload.source,
                    extra: payload.metadata ?? undefined,
                },
                needsBreakdown: true,
            },
        });

        this.logger.verbose(`Created task ${result.id} via capture.`);
        return result;
    }
}
