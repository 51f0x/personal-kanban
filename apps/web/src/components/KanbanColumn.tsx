import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task, ColumnType } from '../api/types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  isOver?: boolean;
}

const columnTypeColors: Record<ColumnType, string> = {
  INPUT: '#f59e0b',
  CLARIFY: '#3b82f6',
  CONTEXT: '#22c55e',
  WAITING: '#8b5cf6',
  SOMEDAY: '#6b7280',
  DONE: '#10b981',
  ARCHIVE: '#374151',
};

const columnTypeIcons: Record<ColumnType, string> = {
  INPUT: '📥',
  CLARIFY: '🎯',
  CONTEXT: '⚡',
  WAITING: '⏳',
  SOMEDAY: '💭',
  DONE: '✅',
  ARCHIVE: '📦',
};

export function KanbanColumn({ column, tasks, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const taskCount = tasks.length;
  const wipLimit = column.wipLimit;
  const isAtLimit = wipLimit !== null && wipLimit !== undefined && taskCount >= wipLimit;
  const isOverLimit = wipLimit !== null && wipLimit !== undefined && taskCount > wipLimit;

  const borderColor = columnTypeColors[column.type] || '#6b7280';

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'drag-over' : ''} ${isAtLimit ? 'at-limit' : ''} ${isOverLimit ? 'over-limit' : ''}`}
      style={{ '--column-color': borderColor } as React.CSSProperties}
    >
      <div className="column-header">
        <div className="column-title">
          <span className="column-icon">{columnTypeIcons[column.type]}</span>
          <span className="column-name">{column.name}</span>
        </div>
        <div className="column-stats">
          <span className={`task-count ${isOverLimit ? 'over' : isAtLimit ? 'at' : ''}`}>
            {taskCount}
            {wipLimit !== null && wipLimit !== undefined && (
              <span className="wip-limit">/{wipLimit}</span>
            )}
          </span>
        </div>
      </div>

      {wipLimit !== null && wipLimit !== undefined && (
        <div className="wip-indicator">
          <div
            className="wip-bar"
            style={{
              width: `${Math.min(100, (taskCount / wipLimit) * 100)}%`,
              backgroundColor: isOverLimit ? '#ef4444' : isAtLimit ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
      )}

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="column-tasks">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <div className="empty-column">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
