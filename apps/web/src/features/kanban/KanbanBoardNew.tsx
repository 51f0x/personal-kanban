import { useState, useMemo, useCallback } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import { Board, Task } from '../../services/types';
import { useTasks } from '../../hooks/useTasks';
import { useBoardRealtime } from '../../hooks/useBoardRealtime';
import { KanbanColumnNew } from './KanbanColumnNew';
import { TaskCardNew } from './TaskCardNew';
import { TaskDetailModal } from './TaskDetailModal';
import { Sidebar } from '../../layouts/Sidebar';
import { KanbanHeader } from '../../layouts/KanbanHeader';

interface KanbanBoardNewProps {
    board: Board;
    onBack?: () => void;
}

export function KanbanBoardNew({ board }: KanbanBoardNewProps) {
    const { tasks, loading, error, moveTask, refresh } = useTasks(board.id);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [overColumnId, setOverColumnId] = useState<string | null>(null);
    const [wipWarning, setWipWarning] = useState<string | null>(null);

    // Subscribe to realtime updates
    useBoardRealtime([board.id], refresh);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 5,
            },
        })
    );

    // Group tasks by column
    const tasksByColumn = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        for (const column of board.columns) {
            grouped[column.id] = [];
        }
        for (const task of tasks) {
            if (grouped[task.columnId]) {
                grouped[task.columnId].push(task);
            } else {
                console.warn(`Task ${task.id} has columnId ${task.columnId} that doesn't exist on board. Task will not be displayed.`);
            }
        }
        // Sort tasks within each column by lastMovedAt
        for (const columnId of Object.keys(grouped)) {
            grouped[columnId].sort(
                (a, b) => new Date(a.lastMovedAt).getTime() - new Date(b.lastMovedAt).getTime()
            );
        }
        return grouped;
    }, [tasks, board.columns]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const task = tasks.find((t) => t.id === event.active.id);
        setActiveTask(task || null);
        setWipWarning(null);
    }, [tasks]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over } = event;
        if (over) {
            const overId = over.id as string;
            const column = board.columns.find((c) => c.id === overId);
            if (column) {
                setOverColumnId(column.id);
            } else {
                const task = tasks.find((t) => t.id === overId);
                if (task) {
                    setOverColumnId(task.columnId);
                }
            }
        } else {
            setOverColumnId(null);
        }
    }, [board.columns, tasks]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        setOverColumnId(null);

        if (!over) return;

        const taskId = active.id as string;
        let targetColumnId = over.id as string;

        const droppedOnTask = tasks.find((t) => t.id === targetColumnId);
        if (droppedOnTask) {
            targetColumnId = droppedOnTask.columnId;
        }

        const targetColumn = board.columns.find((c) => c.id === targetColumnId);
        if (!targetColumn) return;

        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.columnId === targetColumnId) return;

        try {
            const result = await moveTask(taskId, targetColumnId);

            if (!result.success && result.wipStatus) {
                setWipWarning(
                    `WIP limit reached for "${result.wipStatus.columnName}" (${result.wipStatus.currentCount}/${result.wipStatus.wipLimit}). Force move?`
                );
                if (confirm(`WIP limit reached for "${result.wipStatus.columnName}". Move anyway?`)) {
                    await moveTask(taskId, targetColumnId, true);
                    setWipWarning(null);
                }
            }
        } catch (err) {
            console.error('Move failed:', err);
            setWipWarning(err instanceof Error ? err.message : 'Move failed');
        }
    }, [tasks, board.columns, moveTask]);

    const handleDragCancel = useCallback(() => {
        setActiveTask(null);
        setOverColumnId(null);
    }, []);

    // Sort columns by position
    const sortedColumns = useMemo(
        () => [...board.columns].sort((a, b) => a.position - b.position),
        [board.columns]
    );

    // Calculate stats
    const totalTasks = tasks.length;

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <Sidebar taskCount={totalTasks} userCount={2} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col ml-64 overflow-hidden">
                {/* Header */}
                <KanbanHeader
                    boardName={board.name || 'Kanban Dashboard'}
                    totalTasks={totalTasks}
                    onAdd={() => { }}
                    onShare={() => { }}
                    onSortChange={() => { }}
                />

                {/* Board Content */}
                <div className="flex-1 overflow-hidden bg-gray-50">
                    {/* Alerts */}
                    {error && (
                        <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm animate-in fade-in">
                            {error}
                        </div>
                    )}
                    {wipWarning && (
                        <div className="p-4 bg-yellow-50 border-b border-yellow-200 text-yellow-700 text-sm animate-in fade-in">
                            {wipWarning}
                        </div>
                    )}
                    {loading && (
                        <div className="p-4 bg-blue-50 border-b border-blue-200 text-blue-700 text-sm animate-in fade-in">
                            Loading tasks...
                        </div>
                    )}

                    {/* Kanban Columns */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <div className="flex gap-6 flex-1 overflow-x-auto overflow-y-hidden p-6 min-h-[600px] scrollbar-hide">
                            {sortedColumns.map((column) => (
                                <KanbanColumnNew
                                    key={column.id}
                                    column={column}
                                    tasks={tasksByColumn[column.id] || []}
                                    isOver={overColumnId === column.id}
                                    onTaskClick={setSelectedTaskId}
                                    onAddTask={() => { }}
                                />
                            ))}
                        </div>

                        <DragOverlay>
                            {activeTask ? (
                                <div className="transform rotate-2 opacity-90">
                                    <TaskCardNew task={activeTask} isDragging />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>

            {/* Task Detail Modal */}
            {selectedTaskId && (
                <TaskDetailModal
                    taskId={selectedTaskId}
                    board={board}
                    onClose={() => setSelectedTaskId(null)}
                    onUpdate={() => {
                        refresh();
                        setSelectedTaskId(null);
                    }}
                />
            )}
        </div>
    );
}

