import { useParams, useNavigate } from 'react-router-dom';
import { KanbanBoard } from './KanbanBoard';
import { useUsers } from '../hooks/useUsers';
import { useEffect, useState } from 'react';
import { fetchBoardById } from '../api/boards';
import { Board } from '../api/types';

export function BoardView() {
    const { boardId } = useParams<{ boardId: string }>();
    const navigate = useNavigate();
    const [board, setBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!boardId) {
            navigate('/', { replace: true });
            return;
        }

        setLoading(true);
        setError(null);

        fetchBoardById(boardId)
            .then((data) => {
                setBoard(data);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to load board');
                // If board not found, redirect to home after a delay
                if (err instanceof Error && err.message.includes('404')) {
                    setTimeout(() => navigate('/', { replace: true }), 2000);
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [boardId, navigate]);

    if (loading) {
        return (
            <main className="page full-width">
                <div className="banner">Loading board…</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="page full-width">
                <div className="banner error">Error: {error}</div>
            </main>
        );
    }

    if (!board) {
        return (
            <main className="page full-width">
                <div className="banner error">Board not found</div>
            </main>
        );
    }

    return (
        <main className="page full-width">
            <KanbanBoard
                board={board}
                onBack={() => navigate('/')}
            />
        </main>
    );
}

