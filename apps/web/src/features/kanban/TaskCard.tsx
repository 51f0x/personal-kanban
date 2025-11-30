import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskContext } from '../../services/types';
import { getTaskDisplayValue } from '../../utils/taskDisplay';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
}

const contextColors: Record<TaskContext, string> = {
  EMAIL: '#3b82f6',
  MEETING: '#8b5cf6',
  PHONE: '#22c55e',
  READ: '#f59e0b',
  WATCH: '#ec4899',
  DESK: '#06b6d4',
  OTHER: '#6b7280',
};

const contextIcons: Record<TaskContext, string> = {
  EMAIL: '✉️',
  MEETING: '👥',
  PHONE: '📞',
  READ: '📖',
  WATCH: '🎬',
  DESK: '💻',
  OTHER: '📌',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function TaskCard({ task, isDragging, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click if dragging or if clicking on interactive elements
    if (isDragging || (e.target as HTMLElement).closest('button, a')) {
      return;
    }
    e.stopPropagation();
    onClick?.();
  };

  const isStale = task.stale || (() => {
    const lastMoved = new Date(task.lastMovedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastMoved.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  })();

  const checklistProgress = task.checklist?.length
    ? {
      done: task.checklist.filter((c) => c.isDone).length,
      total: task.checklist.length,
    }
    : null;

  // Get display values: use task properties first, fall back to hints only if not set
  const display = getTaskDisplayValue(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`bg-yellow-50 border border-black rounded p-4 cursor-grab transition-all duration-250 touch-none shadow-sm relative overflow-hidden min-h-[60px] ${task.isDone ? 'opacity-80 bg-green-100' : ''
        } ${isStale ? 'border-l-4 border-l-yellow-500' : ''} ${task.needsBreakdown ? 'border-r-4 border-r-cyan-500' : ''
        } ${onClick ? 'cursor-pointer' : ''} hover:border-black hover:-translate-y-0.5 hover:shadow-md hover:bg-yellow-100 active:cursor-grabbing active:scale-[0.98]`}
    >
      <div className="flex justify-between items-start gap-3 mb-2">
        <span className="font-semibold text-sm leading-relaxed flex-1 text-black mb-1">
          {display.title}
        </span>
        {display.context && (
          <span
            className="flex-shrink-0 px-2 py-1 rounded text-xs shadow-sm"
            style={{ backgroundColor: contextColors[display.context], color: 'white' }}
            title={display.context}
          >
            {contextIcons[display.context]}
          </span>
        )}
      </div>

      {display.description && (
        <p className="my-2 text-sm text-black leading-relaxed opacity-80">
          {display.description.slice(0, 100)}{display.description.length > 100 ? '...' : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs mt-3">
        {task.project && (
          <span
            className="bg-black/5 px-2.5 py-1.5 rounded text-black border border-black/10 transition-all duration-250 hover:bg-black/10 opacity-80"
            title={`Project: ${task.project.name}`}
          >
            📁 {task.project.name}
          </span>
        )}

        {task.waitingFor && (
          <span
            className="bg-black/5 px-2.5 py-1.5 rounded text-black border border-black/10 transition-all duration-250 hover:bg-black/10 opacity-80"
            title={`Waiting for: ${task.waitingFor}`}
          >
            ⏳ {task.waitingFor}
          </span>
        )}

        {task.dueAt && (
          <span
            className={`px-2.5 py-1.5 rounded text-black border transition-all duration-250 hover:bg-black/10 opacity-80 ${new Date(task.dueAt) < new Date()
                ? 'bg-red-200/20 text-red-700 border-red-400'
                : 'bg-black/5 border-black/10'
              }`}
          >
            📅 {new Date(task.dueAt).toLocaleDateString()}
          </span>
        )}

        {checklistProgress && (
          <span className="bg-black/5 px-2.5 py-1.5 rounded text-black border border-black/10 transition-all duration-250 hover:bg-black/10 opacity-80">
            ✅ {checklistProgress.done}/{checklistProgress.total}
          </span>
        )}

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.slice(0, 3).map(({ tag }) => (
              <span
                key={tag.id}
                className="px-2 py-1 rounded text-xs text-white font-medium shadow-sm border border-white/10"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-2 py-1 rounded text-xs bg-gray-400/40 text-white border border-gray-500/30">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-black/10">
        <span
          className="text-xs text-gray-600 font-medium"
          title={`Last moved: ${new Date(task.lastMovedAt).toLocaleString()}`}
        >
          {formatRelativeTime(task.lastMovedAt)}
        </span>
        <div className="flex gap-2">
          {isStale && (
            <span className="text-xs px-2 py-1 rounded bg-yellow-200/20 text-yellow-800 border border-yellow-300 font-medium">
              ⚠️ Stale
            </span>
          )}
          {task.needsBreakdown && (
            <span className="text-xs px-2 py-1 rounded bg-cyan-200/20 text-cyan-800 border border-cyan-300 font-medium">
              📋 Break down
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
