import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task, ColumnType } from '../../services/types';
import { TaskCardNew } from './TaskCardNew';
import { Plus } from '@untitledui/icons';

interface KanbanColumnNewProps {
    column: Column;
    tasks: Task[];
    isOver?: boolean;
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (columnId: string) => void;
}

// Column header dot colors based on column type/name using design system tokens
const getColumnDotColor = (columnName: string, columnType: ColumnType): string => {
    const nameLower = columnName.toLowerCase();

    // Match specific column names from design
    if (nameLower.includes('progress') || nameLower.includes('in progress')) {
        return 'var(--color-brand-600)'; // Brand purple
    }
    if (nameLower.includes('review') || nameLower.includes('reviewed')) {
        return 'var(--color-orange-600)'; // Orange
    }
    if (nameLower.includes('complete') || nameLower.includes('done')) {
        return 'var(--color-success-600)'; // Green
    }

    // Default colors by column type
    switch (columnType) {
        case 'CONTEXT':
            return 'var(--color-brand-600)'; // Brand purple
        case 'WAITING':
            return 'var(--color-orange-600)'; // Orange
        case 'DONE':
            return 'var(--color-success-600)'; // Green
        default:
            return 'var(--color-brand-600)'; // Default brand purple
    }
};

export function KanbanColumnNew({ column, tasks, isOver, onTaskClick, onAddTask }: KanbanColumnNewProps) {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });

    const taskCount = tasks.length;
    const dotColor = getColumnDotColor(column.name, column.type);

    return (
        <div
            ref={setNodeRef}
            className={`flex-shrink-0 w-[320px] bg-primary rounded-lg shadow-sm flex flex-col transition-all duration-200 ${
                isOver ? 'ring-2 ring-brand ring-offset-2 shadow-md' : ''
            }`}
        >
            {/* Column Header with colored dot */}
            <div className="px-4 py-3 rounded-t-lg flex items-center justify-between bg-primary border-b border-secondary">
                <div className="flex items-center gap-2.5">
                    {/* Colored dot */}
                    <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dotColor }}
                    />
                    {/* Column name and count */}
                    <h3 className="text-fg-primary font-semibold text-sm tracking-tight">
                        {column.name} ({taskCount})
                    </h3>
                </div>
                <button
                    onClick={() => onAddTask?.(column.id)}
                    className="p-1.5 hover:bg-secondary rounded-full transition-colors active:scale-95 flex items-center justify-center w-8 h-8"
                    aria-label="Add task"
                >
                    <Plus className="w-4 h-4 text-fg-secondary" />
                </button>
            </div>

            {/* Tasks Container */}
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 px-3 py-4 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-[200px] max-h-[calc(100vh-250px)] bg-secondary_subtle scrollbar-hide">
                    {tasks.map((task) => (
                        <TaskCardNew
                            key={task.id}
                            task={task}
                            onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
                        />
                    ))}
                    {tasks.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-fg-tertiary text-sm border-2 border-dashed border-secondary rounded-lg min-h-[150px] m-2 bg-primary/70 transition-all duration-200 hover:border-primary hover:bg-primary/90">
                            Drop tasks here
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
}

