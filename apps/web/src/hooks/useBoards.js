import { useCallback, useEffect, useState } from 'react';
import { fetchBoards } from '../api/boards';
export function useBoards(ownerId) {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const loadBoards = useCallback(async (currentOwnerId) => {
        if (!currentOwnerId) {
            setBoards([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchBoards(currentOwnerId);
            setBoards(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        if (ownerId) {
            loadBoards(ownerId);
        }
        else {
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
    };
}
//# sourceMappingURL=useBoards.js.map