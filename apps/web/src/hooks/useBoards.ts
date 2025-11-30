import { useCallback, useEffect, useState } from 'react';
import { fetchBoards } from '../services/boards';
import type { Board } from '../services/types';

export function useBoards(ownerId?: string) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBoards = useCallback(async (currentOwnerId: string) => {
    if (!currentOwnerId) {
      setBoards([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBoards(currentOwnerId);
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ownerId) {
      loadBoards(ownerId);
    } else {
      setBoards([]);
    }
  }, [ownerId, loadBoards]);

  const refresh = useCallback(() => {
    if (ownerId) {
      void loadBoards(ownerId);
    }
  }, [ownerId, loadBoards]);

  return {
    boards,
    loading,
    error,
    refresh,
  } as const;
}
