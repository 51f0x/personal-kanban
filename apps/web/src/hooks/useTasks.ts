import { useState, useEffect, useCallback } from 'react';
import { Task } from '../services/types';
import {
    fetchTasks,
    moveTask as moveTaskApi,
    deleteTask as deleteTaskApi,
} from '../services/tasks';

export function useTasks(boardId: string | null) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTasks = useCallback(async () => {
        if (!boardId) {
            setTasks([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchTasks(boardId);
            setTasks(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const moveTask = useCallback(
        async (
            taskId: string,
            targetColumnId: string,
            force: boolean = false,
            position?: number,
        ) => {
            try {
                // Optimistic update
                setTasks((prev) =>
                    prev.map((t) =>
                        t.id === taskId
                            ? { ...t, columnId: targetColumnId, position: position ?? t.position }
                            : t,
                    ),
                );

                const result = await moveTaskApi(taskId, targetColumnId, force, position);

                // If WIP limit hit, revert and show warning
                if (result.wipStatus.atLimit && !force) {
                    await loadTasks(); // Reload to get correct state
                    return { success: false, wipStatus: result.wipStatus };
                }

                // Reload to get updated positions
                await loadTasks();

                return { success: true, wipStatus: result.wipStatus };
            } catch (err) {
                // Revert on error
                await loadTasks();
                throw err;
            }
        },
        [loadTasks],
    );

    const deleteTask = useCallback(async (taskId: string) => {
        await deleteTaskApi(taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }, []);

    const refresh = loadTasks;

    return {
        tasks,
        loading,
        error,
        moveTask,
        deleteTask,
        refresh,
    };
}
