import type { Board } from '../api/types';

interface Props {
  board: Board;
}

export function BoardCard({ board }: Props) {
  return (
    <section className="board-card">
      <header>
        <h2>{board.name}</h2>
        {board.description && <p className="muted">{board.description}</p>}
      </header>
      <div className="columns">
        {board.columns?.length ? (
          board.columns.map((column) => (
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
      </div>
    </section>
  );
}
