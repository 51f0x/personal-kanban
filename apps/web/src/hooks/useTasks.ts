import { useState, useEffect, useCallback } from 'react';
import { Task } from '../api/types';
import { fetchTasks, moveTask as moveTaskApi, deleteTask as deleteTaskApi } from '../api/tasks';

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

  const moveTask = useCallback(async (taskId: string, targetColumnId: string, force: boolean = false) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, columnId: targetColumnId } : t))
      );
      
      const result = await moveTaskApi(taskId, targetColumnId, force);
      
      // If WIP limit hit, revert and show warning
      if (result.wipStatus.atLimit && !force) {
        await loadTasks(); // Reload to get correct state
        return { success: false, wipStatus: result.wipStatus };
      }
      
      return { success: true, wipStatus: result.wipStatus };
    } catch (err) {
      // Revert on error
      await loadTasks();
      throw err;
    }
  }, [loadTasks]);

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
