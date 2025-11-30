import { useDroppable } from '@dnd-kit/core';
import { Column, Task, Project } from '../../services/types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanSwimlaneProps {
  swimlane: Project | { id: 'unassigned'; name: string };
  columns: Column[];
  tasksByColumn: Record<string, Task[]>;
  isOver?: boolean;
  overColumnId?: string | null;
  onTaskClick?: (taskId: string) => void;
}

export function KanbanSwimlane({
  swimlane,
  columns,
  tasksByColumn,
  isOver,
  overColumnId,
  onTaskClick,
}: KanbanSwimlaneProps) {
  const { setNodeRef } = useDroppable({
    id: `swimlane-${swimlane.id}`,
  });

  const totalTasks = Object.values(tasksByColumn).flat().length;
  const isUnassigned = swimlane.id === 'unassigned';

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-800/85 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-6 flex flex-col gap-4 shadow-sm transition-all duration-250 relative overflow-hidden ${isOver ? 'bg-blue-500/10 border-blue-500 shadow-glow' : ''
        } ${isUnassigned ? 'opacity-85' : ''} hover:shadow-md hover:border-gray-600/50`}
    >
      {!isUnassigned && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-60 transition-opacity duration-250 hover:opacity-100" />
      )}
      {isUnassigned && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-gray-500" />
      )}
      <div className="flex flex-col gap-2 pb-4 border-b border-gray-600/20">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl filter drop-shadow-sm">{isUnassigned ? '📋' : '📁'}</span>
          <h3 className="text-xl font-semibold text-white m-0 flex-1">{swimlane.name}</h3>
          {totalTasks > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-gray-700/80 text-sm font-medium text-gray-300 border border-gray-600/20">
              {totalTasks} task{totalTasks !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-2 pr-2">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] || []}
            isOver={overColumnId === column.id}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}

