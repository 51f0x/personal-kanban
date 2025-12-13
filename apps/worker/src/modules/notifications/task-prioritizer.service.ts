import { Inject, Injectable, Logger } from '@nestjs/common';
import { GetTasksRequest, GetTasksResponse } from '@personal-kanban/shared';
import { ColumnType, TaskPriority } from '@prisma/client';
import { InterContainerQueueService } from '../inter-container/inter-container-queue.service';

export interface PrioritizedTask {
    id: string;
    title: string;
    description?: string | null;
    dueAt?: Date | null;
    priority?: TaskPriority | null;
    duration?: string | null;
    boardId: string;
    boardName: string;
    columnId: string;
    columnName: string;
    columnType: ColumnType;
    priorityScore: number;
}

@Injectable()
export class TaskPrioritizerService {
    private readonly logger = new Logger(TaskPrioritizerService.name);

    constructor(
        @Inject(InterContainerQueueService)
        private readonly queueService: InterContainerQueueService,
    ) {}

    /**
     * Get prioritized tasks for a user across all their boards
     * Returns tasks sorted by priority score (highest first)
     * Only returns tasks from INPUT columns
     */
    async getPrioritizedTasksForUser(userId: string, limit = 10): Promise<PrioritizedTask[]> {
        // Request tasks from API via queue
        const request: GetTasksRequest = {
            type: 'get-tasks',
            filters: {
                userId,
                columnType: ColumnType.INPUT,
                limit: limit * 2, // Get more than needed for prioritization
            },
        };

        try {
            const response = (await this.queueService.request(
                'api-requests',
                request,
            )) as GetTasksResponse;

            // Calculate priority scores and sort
            const prioritizedTasks = response.tasks
                .map((task) => {
                    // Convert priority string back to enum
                    const priority = task.priority ? (task.priority as TaskPriority) : undefined;

                    return {
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        dueAt: task.dueAt,
                        priority: priority,
                        duration: task.duration,
                        boardId: task.boardId,
                        boardName: task.boardName || 'Unknown Board',
                        columnId: task.columnId,
                        columnName: task.columnName || 'Unknown Column',
                        columnType: ColumnType.INPUT,
                        priorityScore: this.calculatePriorityScore({
                            dueAt: task.dueAt,
                            priority: priority,
                            duration: task.duration,
                            column: { type: ColumnType.INPUT },
                        }),
                    };
                })
                .sort((a, b) => b.priorityScore - a.priorityScore)
                .slice(0, limit);

            this.logger.debug(
                `Found ${prioritizedTasks.length} prioritized tasks for user ${userId} (from ${response.tasks.length} total tasks)`,
            );

            return prioritizedTasks;
        } catch (error) {
            this.logger.error(`Failed to get prioritized tasks for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate priority score for a task (0-100)
     * Higher score = higher priority
     *
     * Factors:
     * - Due date urgency (overdue = 50, due today = 40, due this week = 30, etc.)
     * - Task priority (HIGH = 30, MEDIUM = 15, LOW = 5)
     * - Duration (shorter tasks get slight boost for quick wins)
     * - Column type (INPUT/CLARIFY get slight boost over WAITING/SOMEDAY)
     */
    private calculatePriorityScore(task: {
        dueAt?: Date | null;
        priority?: TaskPriority | null;
        duration?: string | null;
        column: { type: ColumnType };
    }): number {
        let score = 0;

        // Due date urgency (0-50 points)
        if (task.dueAt) {
            const now = new Date();
            const due = new Date(task.dueAt);
            const diffMs = due.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                // Overdue: 50 points + extra for each day overdue (max 10 extra)
                score += 50 + Math.min(Math.abs(diffDays) * 2, 10);
            } else if (diffDays === 0) {
                // Due today: 40 points
                score += 40;
            } else if (diffDays === 1) {
                // Due tomorrow: 35 points
                score += 35;
            } else if (diffDays <= 3) {
                // Due in 2-3 days: 30 points
                score += 30;
            } else if (diffDays <= 7) {
                // Due this week: 20 points
                score += 20;
            } else if (diffDays <= 14) {
                // Due in 2 weeks: 10 points
                score += 10;
            } else {
                // Due later: 5 points
                score += 5;
            }
        }

        // Task priority (0-30 points)
        switch (task.priority) {
            case TaskPriority.HIGH:
                score += 30;
                break;
            case TaskPriority.MEDIUM:
                score += 15;
                break;
            case TaskPriority.LOW:
                score += 5;
                break;
            default:
                // No priority set: 0 points
                break;
        }

        // Duration bonus (0-10 points)
        // Shorter tasks get a slight boost for quick wins
        if (task.duration) {
            const durationLower = task.duration.toLowerCase();
            if (durationLower.includes('minute') || durationLower.includes('min')) {
                const minutes = this.parseDuration(task.duration);
                if (minutes <= 15) {
                    score += 10; // Very quick task
                } else if (minutes <= 30) {
                    score += 7; // Quick task
                } else if (minutes <= 60) {
                    score += 5; // Short task
                }
            } else if (durationLower.includes('hour') || durationLower.includes('hr')) {
                const hours = this.parseDuration(task.duration) / 60;
                if (hours <= 1) {
                    score += 5; // 1 hour task
                } else if (hours <= 2) {
                    score += 3; // 2 hour task
                }
            }
        }

        // Column type bonus (0-10 points)
        // Tasks in INPUT or CLARIFY columns are more actionable
        switch (task.column.type) {
            case ColumnType.INPUT:
                score += 10;
                break;
            case ColumnType.CLARIFY:
                score += 8;
                break;
            case ColumnType.CONTEXT:
                score += 5;
                break;
            case ColumnType.WAITING:
                score += 2; // Less actionable
                break;
            case ColumnType.SOMEDAY:
                score += 0; // Not urgent
                break;
            default:
                score += 3; // Default
                break;
        }

        // Cap at 100
        return Math.min(score, 100);
    }

    /**
     * Parse duration string to minutes
     * Examples: "30 minutes" -> 30, "2 hours" -> 120, "1h" -> 60
     */
    private parseDuration(duration: string): number {
        const lower = duration.toLowerCase();
        const numberMatch = duration.match(/\d+/);
        if (!numberMatch) return 0;

        const number = Number.parseInt(numberMatch[0], 10);

        if (lower.includes('hour') || lower.includes('hr') || lower.includes('h')) {
            return number * 60;
        }
        if (lower.includes('minute') || lower.includes('min') || lower.includes('m')) {
            return number;
        }

        return 0;
    }
}
