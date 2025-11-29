import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task, ColumnType } from '../api/types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  isOver?: boolean;
  onTaskClick?: (taskId: string) => void;
}

const columnTypeColors: Record<ColumnType, string> = {
  INPUT: '#e9ecef', // Light grey for inbox
  CLARIFY: '#fff3cd', // Light yellow
  CONTEXT: '#fff3cd', // Light yellow
  WAITING: '#fff3cd', // Light yellow
  SOMEDAY: '#fff3cd', // Light yellow
  DONE: '#d4edda', // Light green
  ARCHIVE: '#d4edda', // Light green
};

const columnTypeBackgroundColors: Record<ColumnType, string> = {
  INPUT: '#f8f9fa', // Light grey background
  CLARIFY: '#fffef5', // Very light yellow background
  CONTEXT: '#fffef5', // Very light yellow background
  WAITING: '#fffef5', // Very light yellow background
  SOMEDAY: '#fffef5', // Very light yellow background
  DONE: '#f0f9f4', // Very light green background
  ARCHIVE: '#f0f9f4', // Very light green background
};

const columnTypeAccentLines: Record<ColumnType, string | null> = {
  INPUT: null,
  CLARIFY: '#28a745', // Green line for "Preparation - immediate attention"
  CONTEXT: null,
  WAITING: '#28a745', // Green line
  SOMEDAY: null,
  DONE: '#dc3545', // Red line
  ARCHIVE: '#dc3545', // Red line
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

export function KanbanColumn({ column, tasks, isOver, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const taskCount = tasks.length;
  const wipLimit = column.wipLimit;
  const isAtLimit = wipLimit !== null && wipLimit !== undefined && taskCount >= wipLimit;
  const isOverLimit = wipLimit !== null && wipLimit !== undefined && taskCount > wipLimit;

  const borderColor = columnTypeColors[column.type] || '#e9ecef';
  const backgroundColor = columnTypeBackgroundColors[column.type] || '#ffffff';
  const accentLineColor = columnTypeAccentLines[column.type] || null;

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'drag-over' : ''} ${isAtLimit ? 'at-limit' : ''} ${isOverLimit ? 'over-limit' : ''}`}
      style={{ 
        '--column-color': borderColor,
        '--column-bg': backgroundColor,
        '--accent-line': accentLineColor,
      } as React.CSSProperties}
    >
      {accentLineColor && (
        <div 
          className="column-accent-line"
          style={{ backgroundColor: accentLineColor }}
        />
      )}
      <div className="column-header">
        <div className="column-title">
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
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
            />
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
