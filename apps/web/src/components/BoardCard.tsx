import type { Board } from '../api/types';

interface Props {
  board: Board;
  onOpen?: () => void;
}

export function BoardCard({ board, onOpen }: Props) {
  const totalColumns = board.columns?.length ?? 0;

  return (
    <section className="board-card">
      <header className="board-card-header">
        <div>
          <h2>{board.name}</h2>
          {board.description && <p className="muted">{board.description}</p>}
        </div>
        {onOpen && (
          <button type="button" className="open-board-btn" onClick={onOpen}>
            Open Board →
          </button>
        )}
      </header>
      <div className="columns">
        {board.columns?.length ? (
          board.columns.slice(0, 4).map((column) => (
            <article key={column.id} className="column">
              <h3>{column.name}</h3>
              <p className="muted">
                Type: {column.type.toLowerCase()} · WIP {column.wipLimit ?? '∞'}
              </p>
            </article>
          ))
        ) : (
          <p className="muted">No columns configured yet.</p>
        )}
        {totalColumns > 4 && (
          <p className="muted">+{totalColumns - 4} more columns</p>
        )}
      </div>
    </section>
  );
}
