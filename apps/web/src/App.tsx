import { BoardCard } from './components/BoardCard';
import { CaptureForm } from './components/CaptureForm';
import { useBoards } from './hooks/useBoards';
import './app.css';

export function App() {
  const { ownerId, setOwnerId, boards, loading, error, refresh } = useBoards();

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
          <label htmlFor="ownerId">Owner ID</label>
          <input
            id="ownerId"
            value={ownerId}
            placeholder="Paste user UUID"
            onChange={(event) => setOwnerId(event.target.value)}
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
          <BoardCard key={board.id} board={board} />
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
