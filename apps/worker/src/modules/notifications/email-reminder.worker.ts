import { randomBytes } from 'node:crypto';
import {
    Inject,
    Injectable,
    Logger,
    type OnModuleDestroy,
    type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    CreateEmailActionTokenRequest,
    GetColumnsRequest,
    GetColumnsResponse,
    GetUsersRequest,
    GetUsersResponse,
    MoveTasksRequest,
} from '@personal-kanban/shared';
import { ColumnType } from '@prisma/client';
import { InterContainerQueueService } from '../inter-container/inter-container-queue.service';
import { EmailService, EmailTask, WorkPackageEmail } from './email.service';
import { TaskPrioritizerService } from './task-prioritizer.service';

@Injectable()
export class EmailReminderWorker implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EmailReminderWorker.name);
    private interval?: NodeJS.Timeout;
    private readonly enabled: boolean;
    private readonly reminderIntervalHours: number;
    private readonly maxTasksPerEmail: number;
    private readonly apiUrl: string;
    private readonly webUrl: string;

    constructor(
        @Inject(InterContainerQueueService)
        private readonly queueService: InterContainerQueueService,
        private readonly emailService: EmailService,
        private readonly taskPrioritizer: TaskPrioritizerService,
        private readonly configService: ConfigService,
    ) {
        this.enabled = this.configService.get<string>('EMAIL_REMINDERS_ENABLED', 'true') === 'true';
        this.reminderIntervalHours = this.configService.get<number>(
            'EMAIL_REMINDER_INTERVAL_HOURS',
            24,
        );
        this.maxTasksPerEmail = this.configService.get<number>('EMAIL_MAX_TASKS_PER_EMAIL', 10);
        this.apiUrl = this.configService.get<string>('API_URL', 'http://localhost:3000');
        this.webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:5173');
    }

    async onModuleInit() {
        if (!this.enabled) {
            this.logger.log('Email reminders disabled');
            return;
        }

        if (!this.emailService.isAvailable()) {
            this.logger.warn('Email service not available, email reminders disabled');
            return;
        }

        // Run immediately on startup, then on interval
        this.sendRemindersToAllUsers().catch((error) => {
            this.logger.error('Failed to send initial email reminders', error);
        });

        const intervalMs = this.reminderIntervalHours * 60 * 60 * 1000;
        this.interval = setInterval(() => {
            this.sendRemindersToAllUsers().catch((error) => {
                this.logger.error('Failed to send scheduled email reminders', error);
            });
        }, intervalMs);

        this.logger.log(
            `Email reminder worker started (interval: ${this.reminderIntervalHours} hours, max tasks: ${this.maxTasksPerEmail})`,
        );
    }

    async onModuleDestroy() {
        if (this.interval) {
            clearInterval(this.interval);
            this.logger.log('Email reminder worker stopped');
        }
    }

    /**
     * Send email reminders to all users with prioritized work packages
     */
    async sendRemindersToAllUsers(): Promise<void> {
        this.logger.log('Starting email reminder job for all users');

        try {
            // Get all users from API via queue
            const request: GetUsersRequest = {
                type: 'get-users',
                filters: {
                    hasEmail: true,
                },
            };

            const response = (await this.queueService.request(
                'api-requests',
                request,
            )) as GetUsersResponse;

            const validUsers = response.users;

            this.logger.log(`Found ${validUsers.length} users with valid email addresses`);

            let successCount = 0;
            let errorCount = 0;

            for (const user of validUsers) {
                try {
                    const sent = await this.sendReminderToUser(user.id, user.email, user.name);
                    if (sent) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    this.logger.error(`Failed to send reminder to user ${user.email}`, error);
                    errorCount++;
                }
            }

            this.logger.log(
                `Email reminder job completed: ${successCount} sent, ${errorCount} failed, ${validUsers.length - successCount - errorCount} skipped`,
            );
        } catch (error) {
            this.logger.error('Failed to process email reminders', error);
            throw error;
        }
    }

    /**
     * Send email reminder to a specific user
     */
    async sendReminderToUser(
        userId: string,
        userEmail: string,
        userName?: string | null,
    ): Promise<boolean> {
        try {
            // Validate email address before processing
            if (!userEmail || !userEmail.trim()) {
                this.logger.warn(`User ${userId} has no email address, skipping reminder`);
                return false;
            }

            // Get prioritized tasks for user
            const prioritizedTasks = await this.taskPrioritizer.getPrioritizedTasksForUser(
                userId,
                this.maxTasksPerEmail,
            );

            if (prioritizedTasks.length === 0) {
                this.logger.debug(`No tasks to send for user ${userEmail}`);
                return false;
            }

            // Convert to email tasks with URLs
            const emailTasks: EmailTask[] = await Promise.all(
                prioritizedTasks.map(async (task) => {
                    const completeToken = await this.createEmailActionToken(
                        userId,
                        task.id,
                        'complete',
                    );
                    const taskUrl = `${this.webUrl}/boards/${task.boardId}?task=${task.id}`;
                    const completeUrl = `${this.apiUrl}/email-actions/complete?token=${completeToken}`;

                    return {
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        dueAt: task.dueAt,
                        priority: task.priority,
                        duration: task.duration,
                        boardName: task.boardName,
                        columnName: task.columnName,
                        taskUrl,
                        completeUrl,
                        priorityScore: task.priorityScore,
                    };
                }),
            );

            // Count urgent and overdue tasks
            const now = new Date();
            const urgentTasks = emailTasks.filter((t) => t.priorityScore >= 80).length;
            const overdueTasks = emailTasks.filter(
                (t) => t.dueAt && new Date(t.dueAt) < now,
            ).length;

            // Prepare email package
            const emailPackage: WorkPackageEmail = {
                userEmail,
                userName,
                tasks: emailTasks,
                totalTasks: emailTasks.length,
                urgentTasks,
                overdueTasks,
            };

            // Send email
            const sent = await this.emailService.sendWorkPackageEmail(emailPackage);
            if (sent) {
                this.logger.log(
                    `Sent work package email to ${userEmail} with ${emailTasks.length} tasks`,
                );

                // Move tasks to next action column (CONTEXT type) after successful email send
                await this.moveTasksToNextActionColumn(prioritizedTasks);
            }

            return sent;
        } catch (error) {
            this.logger.error(`Failed to send reminder to user ${userEmail}`, error);
            return false;
        }
    }

    /**
     * Move tasks to the next action column (CONTEXT type) after sending email
     */
    private async moveTasksToNextActionColumn(
        tasks: Array<{ id: string; boardId: string }>,
    ): Promise<void> {
        // Group tasks by board to find next action columns efficiently
        const tasksByBoard = new Map<string, string[]>();
        for (const task of tasks) {
            const boardTasks = tasksByBoard.get(task.boardId) || [];
            boardTasks.push(task.id);
            tasksByBoard.set(task.boardId, boardTasks);
        }

        // Process each board
        for (const [boardId, taskIds] of tasksByBoard.entries()) {
            try {
                // Find the next action column (CONTEXT type) for this board via queue
                const columnsRequest: GetColumnsRequest = {
                    type: 'get-columns',
                    filters: {
                        boardId,
                        type: ColumnType.CONTEXT,
                    },
                };

                const columnsResponse = (await this.queueService.request(
                    'api-requests',
                    columnsRequest,
                )) as GetColumnsResponse;

                const allContextColumns = columnsResponse.columns;

                if (allContextColumns.length === 0) {
                    this.logger.warn(
                        `No CONTEXT column found for board ${boardId}, skipping task moves`,
                    );
                    continue;
                }

                // Prefer "Next Actions" column if it exists, otherwise use first CONTEXT column
                const nextActionColumn =
                    allContextColumns.find((col) =>
                        col.name.toLowerCase().includes('next action'),
                    ) || allContextColumns[0];

                // Move all tasks to the next action column via queue
                const moveRequest: MoveTasksRequest = {
                    type: 'move-tasks',
                    taskIds,
                    targetColumnId: nextActionColumn.id,
                    boardId,
                };

                await this.queueService.request('api-requests', moveRequest);

                this.logger.log(
                    `Moved ${taskIds.length} task(s) from INPUT to "${nextActionColumn.name}" column in board ${boardId}`,
                );
            } catch (error) {
                this.logger.error(
                    `Failed to move tasks to next action column for board ${boardId}`,
                    error,
                );
            }
        }
    }

    /**
     * Create a secure email action token for task completion
     */
    private async createEmailActionToken(
        userId: string,
        taskId: string,
        action: string,
    ): Promise<string> {
        const request: CreateEmailActionTokenRequest = {
            type: 'create-email-action-token',
            userId,
            taskId,
            action,
        };

        const response = (await this.queueService.request('api-requests', request)) as {
            token: string;
        };

        return response.token;
    }
}
