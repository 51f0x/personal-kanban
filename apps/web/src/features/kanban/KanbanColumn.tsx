import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task, ColumnType } from '../../services/types';
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
      className={`flex-shrink-0 w-[300px] min-h-[550px] max-h-[calc(100vh-300px)] bg-white border-2 rounded transition-all duration-250 shadow-sm flex flex-col relative ${isOver ? 'bg-yellow-100/15 border-yellow-400 border-[3px] shadow-lg scale-[1.01]' : ''
        } ${isAtLimit ? 'border-yellow-500' : ''} ${isOverLimit ? 'border-red-500 bg-red-50/5' : ''} hover:shadow-md`}
      style={{
        borderColor: isOver ? '#fbbf24' : borderColor,
        backgroundColor: isOver ? 'rgba(255, 193, 7, 0.15)' : backgroundColor,
      }}
    >
      {accentLineColor && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 z-[3]"
          style={{ backgroundColor: accentLineColor }}
        />
      )}
      <div className="flex justify-between items-center px-5 py-4 border-b-2 border-black bg-white rounded-t min-h-[50px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base text-black">{column.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold text-black px-2.5 py-1.5 rounded bg-black/5 border border-black/10 min-w-[2.5rem] text-center ${isOverLimit ? 'text-red-600 bg-red-100' : isAtLimit ? 'text-yellow-600 bg-yellow-100' : ''
            }`}>
            {taskCount}
            {wipLimit !== null && wipLimit !== undefined && (
              <span className="font-normal text-gray-600">/{wipLimit}</span>
            )}
          </span>
        </div>
      </div>

      {wipLimit !== null && wipLimit !== undefined && (
        <div className="h-1 bg-gray-200 mx-4 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-350 shadow-sm"
            style={{
              width: `${Math.min(100, (taskCount / wipLimit) * 100)}%`,
              backgroundColor: isOverLimit ? '#ef4444' : isAtLimit ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
      )}

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 px-3 py-3 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-[200px] bg-white">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
            />
          ))}
          {tasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded min-h-[150px] m-2 bg-gray-50/50 transition-all duration-250 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-600 italic">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
