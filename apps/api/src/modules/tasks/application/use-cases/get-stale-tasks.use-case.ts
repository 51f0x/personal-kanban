import { Injectable, Inject } from '@nestjs/common';
import {
    ITaskRepository,
    BoardId,
} from '@personal-kanban/shared';

/**
 * GetStaleTasksUseCase
 * Encapsulates the business logic for finding stale tasks
 */
@Injectable()
export class GetStaleTasksUseCase {
    constructor(
        @Inject('ITaskRepository') private readonly taskRepository: ITaskRepository,
    ) {}

    async execute(boardId: string, thresholdDays: number = 7) {
        // Use repository method for finding stale tasks
        // Note: Repository method doesn't filter by column type, so we'll filter after
        const staleTasks = await this.taskRepository.findStaleTasks(thresholdDays);
        
        // Filter by board and column type
        const boardIdVO = BoardId.from(boardId);
        const boardTasks = await this.taskRepository.findByBoardId(boardIdVO, {
            includeColumn: true,
            includeProject: true,
        });

        // Filter tasks that are stale, not done, and not in excluded column types
        const excludedTypes = ['DONE', 'ARCHIVE', 'SOMEDAY'];
        const staleTaskIds = new Set(staleTasks.map(t => t.id));
        
        return boardTasks
            .filter(task => 
                staleTaskIds.has(task.id) && 
                !task.isDone && 
                task.column &&
                !excludedTypes.includes(task.column.type)
            )
            .sort((a, b) => a.lastMovedAt.getTime() - b.lastMovedAt.getTime());
    }
}
