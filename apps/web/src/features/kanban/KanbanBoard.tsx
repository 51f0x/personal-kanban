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
import { Board, Task, Project } from '../../services/types';
import { useTasks } from '../../hooks/useTasks';
import { useBoardRealtime } from '../../hooks/useBoardRealtime';
import { KanbanColumn } from './KanbanColumn';
import { KanbanSwimlane } from './KanbanSwimlane';
import { TaskCard } from './TaskCard';
import { FilterBar, Filters } from './FilterBar';
import { TaskDetailModal } from './TaskDetailModal';
import { Button } from '@/components/base/buttons/button';
import { Badge } from '@/components/base/badges/badges';
import { Tabs } from '@/components/application/tabs/tabs';

interface KanbanBoardProps {
  board: Board;
  onBack: () => void;
}

export function KanbanBoard({ board, onBack }: KanbanBoardProps) {
  const { tasks, loading, error, moveTask, refresh } = useTasks(board.id);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [wipWarning, setWipWarning] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'swimlanes' | 'columns'>('columns');

  const [filters, setFilters] = useState<Filters>({
    context: null,
    columnType: null,
    projectId: null,
    showStale: false,
    showDone: true,
    searchQuery: '',
  });

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

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Context filter
      if (filters.context && task.context !== filters.context) {
        return false;
      }

      // Column type filter
      if (filters.columnType) {
        const column = board.columns.find((c) => c.id === task.columnId);
        if (!column || column.type !== filters.columnType) {
          return false;
        }
      }

      // Project filter
      if (filters.projectId && task.projectId !== filters.projectId) {
        return false;
      }

      // Stale filter
      if (filters.showStale) {
        const lastMoved = new Date(task.lastMovedAt);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - lastMoved.getTime()) / (1000 * 60 * 60 * 24));
        const isStale = task.stale || diffDays >= 7;
        if (!isStale) return false;
      }

      // Done filter
      if (!filters.showDone && task.isDone) {
        return false;
      }

      return true;
    });
  }, [tasks, filters, board.columns]);

  // Group tasks by column (for column view)
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    for (const column of board.columns) {
      grouped[column.id] = [];
    }
    for (const task of filteredTasks) {
      if (grouped[task.columnId]) {
        grouped[task.columnId].push(task);
      } else {
        // Task has a columnId that doesn't match any column on the board
        // This shouldn't happen but we'll log it for debugging
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
  }, [filteredTasks, board.columns]);

  // Group tasks by swimlane (project) and column (for swimlane view)
  const tasksBySwimlane = useMemo(() => {
    const projects = board.projects || [];
    const hasUnassigned = filteredTasks.some((t) => !t.projectId);
    const swimlanes: Array<Project | { id: 'unassigned'; name: string }> = [
      ...projects,
      ...(hasUnassigned ? [{ id: 'unassigned' as const, name: 'Unassigned' }] : []),
    ];

    const grouped: Record<string, Record<string, Task[]>> = {};

    for (const swimlane of swimlanes) {
      grouped[swimlane.id] = {};
      for (const column of board.columns) {
        grouped[swimlane.id][column.id] = [];
      }
    }

    for (const task of filteredTasks) {
      const swimlaneId = task.projectId || 'unassigned';
      if (grouped[swimlaneId] && grouped[swimlaneId][task.columnId]) {
        grouped[swimlaneId][task.columnId].push(task);
      }
    }

    // Sort tasks within each column by lastMovedAt
    for (const swimlaneId of Object.keys(grouped)) {
      for (const columnId of Object.keys(grouped[swimlaneId])) {
        grouped[swimlaneId][columnId].sort(
          (a, b) => new Date(a.lastMovedAt).getTime() - new Date(b.lastMovedAt).getTime()
        );
      }
    }

    return grouped;
  }, [filteredTasks, board.columns, board.projects]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
    setWipWarning(null);
  }, [tasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Check if over is a column or a task
      const overId = over.id as string;
      const column = board.columns.find((c) => c.id === overId);
      if (column) {
        setOverColumnId(column.id);
      } else {
        // It's a task - find its column
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

    // Check if dropped on a task - get its column
    const droppedOnTask = tasks.find((t) => t.id === targetColumnId);
    if (droppedOnTask) {
      targetColumnId = droppedOnTask.columnId;
    }

    // Check if it's a valid column
    const targetColumn = board.columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    // Find the task being moved
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.columnId === targetColumnId) return;

    try {
      const result = await moveTask(taskId, targetColumnId);

      if (!result.success && result.wipStatus) {
        setWipWarning(
          `WIP limit reached for "${result.wipStatus.columnName}" (${result.wipStatus.currentCount}/${result.wipStatus.wipLimit}). Force move?`
        );
        // Offer force move option
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

  // Get projects for filter and swimlanes
  const projects = useMemo(() => board.projects || [], [board.projects]);
  const swimlanes = useMemo(() => {
    const hasUnassigned = filteredTasks.some((t) => !t.projectId);
    return [
      ...projects,
      ...(hasUnassigned ? [{ id: 'unassigned', name: 'Unassigned' }] : []),
    ];
  }, [projects, filteredTasks]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.isDone).length;
    const stale = tasks.filter((t) => {
      if (t.isDone) return false;
      const lastMoved = new Date(t.lastMovedAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastMoved.getTime()) / (1000 * 60 * 60 * 24));
      return t.stale || diffDays >= 7;
    }).length;
    const inProgress = tasks.filter(
      (t) => !t.isDone && board.columns.find((c) => c.id === t.columnId)?.type === 'CONTEXT'
    ).length;

    return { total, done, stale, inProgress };
  }, [tasks, board.columns]);

  return (
    <div
      className="flex flex-col gap-6 h-[calc(100vh-2rem)] p-6 rounded-2xl overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at top, #2d1b3d 0%, #1a1625 50%, #0f0a15 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header Section - Cosy and inviting */}
      <div className="flex items-center gap-6 flex-wrap pb-6 border-b border-white/10 bg-[rgba(45,39,56,0.85)] backdrop-blur-md p-6 rounded-xl shadow-lg">
        <Button
          size="sm"
          color="secondary"
          onClick={onBack}
          className="bg-[rgba(255,138,92,0.15)] text-[#ffb88c] border border-[rgba(255,138,92,0.4)] hover:bg-[rgba(255,138,92,0.25)] hover:border-[#ff8a5c]"
        >
          ← Back
        </Button>
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-3xl font-bold m-0 mb-2 bg-gradient-to-r from-[#f5f3f7] to-[#ffb88c] bg-clip-text text-transparent">
            {board.name}
          </h2>
          {board.description && (
            <p className="text-[#c9c4d0] text-sm mt-1 mb-0 leading-relaxed">
              {board.description}
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <Badge type="pill-color" color="gray" size="md">
            📊 {stats.total} tasks
          </Badge>
          <Badge type="pill-color" color="success" size="md">
            ✅ {stats.done} done
          </Badge>
          <Badge type="pill-color" color="blue" size="md">
            ⚡ {stats.inProgress} in progress
          </Badge>
          {stats.stale > 0 && (
            <Badge type="pill-color" color="warning" size="md">
              ⚠️ {stats.stale} stale
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          color="primary"
          onClick={refresh}
          isDisabled={loading}
          isLoading={loading}
        >
          🔄 Refresh
        </Button>
      </div>

      <FilterBar filters={filters} onFiltersChange={setFilters} projects={projects} />

      {/* View Mode Toggle - Using Untitled UI Tabs */}
      <Tabs selectedKey={viewMode} onSelectionChange={(key) => setViewMode(key as 'swimlanes' | 'columns')}>
        <Tabs.List
          type="button-border"
          size="sm"
          fullWidth
          items={[
            { id: 'swimlanes', label: '🏊 Swimlanes' },
            { id: 'columns', label: '📊 Columns' },
          ]}
        >
          {(item) => <Tabs.Item id={item.id}>{item.label}</Tabs.Item>}
        </Tabs.List>
      </Tabs>

      {/* Alerts - Cosy styling */}
      {error && (
        <div className="p-4 rounded-xl bg-[rgba(255,107,107,0.15)] border border-[rgba(255,107,107,0.3)] text-[#ffb3b3] text-sm backdrop-blur-sm animate-in fade-in">
          {error}
        </div>
      )}
      {wipWarning && (
        <div className="p-4 rounded-xl bg-[rgba(255,201,107,0.15)] border border-[rgba(255,201,107,0.3)] text-[#ffe0b3] text-sm backdrop-blur-sm animate-in fade-in">
          {wipWarning}
        </div>
      )}
      {loading && (
        <div className="p-4 rounded-xl bg-[rgba(157,148,168,0.1)] border border-[rgba(157,148,168,0.15)] text-[#9d94a8] text-sm backdrop-blur-sm animate-in fade-in">
          Loading tasks...
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {viewMode === 'swimlanes' ? (
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pb-4 pr-2 scrollbar-hide">
            {swimlanes.map((swimlane) => (
              <KanbanSwimlane
                key={swimlane.id}
                swimlane={swimlane}
                columns={sortedColumns}
                tasksByColumn={tasksBySwimlane[swimlane.id] || {}}
                overColumnId={overColumnId}
                onTaskClick={setSelectedTaskId}
              />
            ))}
            {swimlanes.length === 0 && (
              <div className="p-12 text-center text-[#9d94a8] bg-[rgba(45,39,56,0.85)] backdrop-blur-md border-2 border-dashed border-[rgba(157,148,168,0.25)] rounded-2xl">
                <p className="m-0 text-base leading-relaxed">No projects found. Create a project to organize tasks in swimlanes.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-5 flex-1 overflow-x-auto overflow-y-hidden p-6 pb-6 pr-4 min-h-[600px] scrollbar-hide">
            {sortedColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] || []}
                isOver={overColumnId === column.id}
                onTaskClick={setSelectedTaskId}
              />
            ))}
          </div>
        )}

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

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
