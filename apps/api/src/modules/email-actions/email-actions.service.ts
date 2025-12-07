import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@personal-kanban/shared';
import { TaskService } from '../tasks/task.service';
import { ColumnType } from '@prisma/client';

export interface CompleteTaskResult {
    success: boolean;
    taskId?: string;
    boardId?: string;
    error?: string;
}

export interface ViewTaskResult {
    success: boolean;
    taskId?: string;
    boardId?: string;
    error?: string;
}

@Injectable()
export class EmailActionsService {
    private readonly logger = new Logger(EmailActionsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly taskService: TaskService,
    ) {}

    /**
     * Complete a task using an email action token
     */
    async completeTaskByToken(token: string): Promise<CompleteTaskResult> {
        // Find the token
        const emailToken = await this.prisma.emailActionToken.findUnique({
            where: { token },
            include: {
                task: {
                    include: {
                        column: true,
                        board: true,
                    },
                },
            },
        });

        if (!emailToken) {
            return {
                success: false,
                error: 'Invalid token',
            };
        }

        // Check if token is expired
        if (new Date() > emailToken.expiresAt) {
            return {
                success: false,
                error: 'Token has expired',
            };
        }

        // Check if token has already been used
        if (emailToken.usedAt) {
            return {
                success: false,
                error: 'Token has already been used',
            };
        }

        // Check if task is already done
        if (emailToken.task.isDone) {
            // Mark token as used anyway
            await this.prisma.emailActionToken.update({
                where: { id: emailToken.id },
                data: { usedAt: new Date() },
            });

            return {
                success: true,
                taskId: emailToken.task.id,
                boardId: emailToken.task.boardId,
            };
        }

        try {
            // Find the DONE column for this board
            const doneColumn = await this.prisma.column.findFirst({
                where: {
                    boardId: emailToken.task.boardId,
                    type: ColumnType.DONE,
                },
            });

            if (!doneColumn) {
                this.logger.warn(`No DONE column found for board ${emailToken.task.boardId}`);
                return {
                    success: false,
                    error: 'No DONE column found for this board',
                };
            }

            // Move task to DONE column
            await this.taskService.moveTask(emailToken.task.id, {
                columnId: doneColumn.id,
            });

            // Mark token as used
            await this.prisma.emailActionToken.update({
                where: { id: emailToken.id },
                data: { usedAt: new Date() },
            });

            this.logger.log(`Task ${emailToken.task.id} completed via email token`);

            return {
                success: true,
                taskId: emailToken.task.id,
                boardId: emailToken.task.boardId,
            };
        } catch (error) {
            this.logger.error(
                `Failed to complete task ${emailToken.task.id} via email token`,
                error,
            );
            return {
                success: false,
                error: 'Failed to complete task',
            };
        }
    }

    /**
     * Get task information using an email action token
     */
    async getTaskByToken(token: string): Promise<ViewTaskResult> {
        // Find the token
        const emailToken = await this.prisma.emailActionToken.findUnique({
            where: { token },
            include: {
                task: true,
            },
        });

        if (!emailToken) {
            return {
                success: false,
                error: 'Invalid token',
            };
        }

        // Check if token is expired
        if (new Date() > emailToken.expiresAt) {
            return {
                success: false,
                error: 'Token has expired',
            };
        }

        return {
            success: true,
            taskId: emailToken.task.id,
            boardId: emailToken.task.boardId,
        };
    }
}
