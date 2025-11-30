import type { Board } from '../../services/types';

interface Props {
  board: Board;
  onOpen?: () => void;
}

export function BoardCard({ board, onOpen }: Props) {
  const totalColumns = board.columns?.length ?? 0;

  return (
    <section className="bg-gray-800/85 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-250 hover:shadow-xl hover:border-gray-600/50 hover:-translate-y-1 cursor-pointer">
      <header className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-white mb-1">{board.name}</h2>
          {board.description && <p className="text-gray-400 text-sm">{board.description}</p>}
        </div>
        {onOpen && (
          <button 
            type="button" 
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold whitespace-nowrap shadow-md hover:shadow-lg transition-all duration-250"
            onClick={onOpen}
          >
            Open Board →
          </button>
        )}
      </header>
      <div className="flex flex-col gap-3">
        {board.columns?.length ? (
          board.columns.slice(0, 4).map((column) => (
            <article key={column.id} className="p-4 rounded-lg bg-gray-700/40 border border-gray-600/20 transition-all duration-250 hover:bg-gray-700/60 hover:border-gray-600/40">
              <h3 className="text-base font-semibold text-white mb-1">{column.name}</h3>
              <p className="text-gray-400 text-sm">
                Type: {column.type.toLowerCase()} · WIP {column.wipLimit ?? '∞'}
              </p>
            </article>
          ))
        ) : (
          <p className="text-gray-400 text-sm">No columns configured yet.</p>
        )}
        {totalColumns > 4 && (
          <p className="text-gray-400 text-sm">+{totalColumns - 4} more columns</p>
        )}
      </div>
    </section>
  );
}
