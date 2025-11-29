import { useDroppable } from '@dnd-kit/core';
import { Column, Task, Project } from '../api/types';
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
      className={`kanban-swimlane ${isOver ? 'drag-over' : ''} ${isUnassigned ? 'unassigned' : ''}`}
    >
      <div className="swimlane-header">
        <div className="swimlane-title">
          <span className="swimlane-icon">{isUnassigned ? '📋' : '📁'}</span>
          <h3 className="swimlane-name">{swimlane.name}</h3>
          {totalTasks > 0 && (
            <span className="swimlane-count">{totalTasks} task{totalTasks !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className="swimlane-columns">
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

