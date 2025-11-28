import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskContext } from '../api/types';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
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

export function TaskCard({ task, isDragging }: TaskCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card ${task.isDone ? 'done' : ''} ${isStale ? 'stale' : ''} ${task.needsBreakdown ? 'needs-breakdown' : ''}`}
    >
      <div className="task-header">
        <span className="task-title">{task.title}</span>
        {task.context && (
          <span
            className="task-context-badge"
            style={{ backgroundColor: contextColors[task.context] }}
            title={task.context}
          >
            {contextIcons[task.context]}
          </span>
        )}
      </div>

      {task.description && (
        <p className="task-description">{task.description.slice(0, 100)}{task.description.length > 100 ? '...' : ''}</p>
      )}

      <div className="task-meta">
        {task.project && (
          <span className="task-project" title={`Project: ${task.project.name}`}>
            📁 {task.project.name}
          </span>
        )}

        {task.waitingFor && (
          <span className="task-waiting" title={`Waiting for: ${task.waitingFor}`}>
            ⏳ {task.waitingFor}
          </span>
        )}

        {task.dueAt && (
          <span className={`task-due ${new Date(task.dueAt) < new Date() ? 'overdue' : ''}`}>
            📅 {new Date(task.dueAt).toLocaleDateString()}
          </span>
        )}

        {checklistProgress && (
          <span className="task-checklist">
            ✅ {checklistProgress.done}/{checklistProgress.total}
          </span>
        )}

        {task.tags && task.tags.length > 0 && (
          <div className="task-tags">
            {task.tags.slice(0, 3).map(({ tag }) => (
              <span
                key={tag.id}
                className="task-tag"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="task-tag more">+{task.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="task-footer">
        <span className="task-age" title={`Last moved: ${new Date(task.lastMovedAt).toLocaleString()}`}>
          {formatRelativeTime(task.lastMovedAt)}
        </span>
        {isStale && <span className="stale-badge">⚠️ Stale</span>}
        {task.needsBreakdown && <span className="breakdown-badge">📋 Break down</span>}
      </div>
    </div>
  );
}
