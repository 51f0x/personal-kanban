import { useState } from 'react';
import { BoardCard } from './components/BoardCard';
import { CaptureForm } from './components/CaptureForm';
import { OwnerSelector } from './components/OwnerSelector';
import { KanbanBoard } from './components/KanbanBoard';
import { useBoards } from './hooks/useBoards';
import { useUsers } from './hooks/useUsers';
import { useBoardRealtime } from './hooks/useBoardRealtime';
import { Board } from './api/types';
import './app.css';

export function App() {
  const {
    users,
    ownerId,
    setOwnerId,
    loading: usersLoading,
    error: usersError,
    createUser,
  } = useUsers();
  const {
    boards,
    loading: boardsLoading,
    error: boardsError,
    refresh,
  } = useBoards(ownerId);
  useBoardRealtime(
    boards.map((board) => board.id),
    refresh,
  );

  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  const loading = usersLoading || boardsLoading;
  const error = usersError || boardsError;

  // Show Kanban board view when a board is selected
  if (selectedBoard) {
    return (
      <main className="page full-width">
        <KanbanBoard
          board={selectedBoard}
          onBack={() => setSelectedBoard(null)}
        />
      </main>
    );
  }

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Workspace preview</p>
          <h1>Personal Kanban</h1>
          <p className="muted">
            Connect to your self-hosted API, then explore boards, columns, and contexts in real time.
          </p>
        </div>
        <div className="controls">
          <OwnerSelector
            users={users}
            ownerId={ownerId}
            setOwnerId={setOwnerId}
            onRegister={async (payload) => {
              await createUser(payload);
              refresh();
            }}
            loading={usersLoading}
          />
          <button type="button" onClick={refresh} disabled={!ownerId || loading}>
            Refresh boards
          </button>
        </div>
      </header>

      {error && <div className="banner error">Error: {error}</div>}
      {loading && <div className="banner">Loading boards…</div>}

      <CaptureForm boards={boards} ownerId={ownerId} onCaptured={refresh} />

      <div className="boards-grid">
        {boards.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            onOpen={() => setSelectedBoard(board)}
          />
        ))}

        {!loading && !boards.length && ownerId && (
          <div className="empty-state">
            <p>No boards found for this owner.</p>
          </div>
        )}
      </div>
    </main>
  );
}
