import { useCallback, useEffect, useState } from 'react';
import { fetchBoards } from '../api/boards';
import type { Board } from '../api/types';

const DEFAULT_OWNER_ID = import.meta.env.VITE_OWNER_ID ?? '';

export function useBoards(initialOwnerId = DEFAULT_OWNER_ID) {
  const [ownerId, setOwnerId] = useState(initialOwnerId);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBoards = useCallback(
    async (currentOwnerId: string) => {
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
    },
    [],
  );

  useEffect(() => {
    if (ownerId) {
      loadBoards(ownerId);
    }
  }, [ownerId, loadBoards]);

  return {
    ownerId,
    setOwnerId,
    boards,
    loading,
    error,
    refresh: () => ownerId && loadBoards(ownerId),
  } as const;
}
