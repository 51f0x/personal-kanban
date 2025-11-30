import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
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
    useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { fetchBoardById } from '../services/boards';
import { Board, Task } from '../services/types';
import { useTasks } from '../hooks/useTasks';
import { useBoardRealtime } from '../hooks/useBoardRealtime';
import { useUsers } from '../hooks/useUsers';
import { TaskCardNew } from '../features/kanban/TaskCardNew';
import { TaskDetailModal } from '../features/kanban/TaskDetailModal';
import { createTask } from '../services/tasks';
import { Button } from '@/components/base/buttons/button';
import { Tabs } from '@/components/application/tabs/tabs';
import { SearchLg } from '@untitledui/icons';
import { Avatar } from '@/components/base/avatar/avatar';
import { Input } from '@/components/base/input/input';

interface CreateTaskModalProps {
    board: Board;
    columnId: string;
    onClose: () => void;
    onCreate: () => void;
}

function CreateTaskModal({ board, columnId, onClose, onCreate }: CreateTaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const { ownerId } = useUsers();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !ownerId) return;

        setLoading(true);
        try {
            await createTask({
                boardId: board.id,
                columnId,
                ownerId,
                title: title.trim(),
                description: description.trim() || undefined,
            });
            onCreate();
            onClose();
        } catch (err) {
            console.error('Failed to create task:', err);
            alert('Failed to create task. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.2)',
            }} onClick={(e) => e.stopPropagation()}>
                <h2 style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#1E293B',
                    marginBottom: '16px',
                }}>Create New Task</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#475569',
                            marginBottom: '8px',
                        }}>Title *</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task title"
                            required
                            autoFocus
                        />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#475569',
                            marginBottom: '8px',
                        }}>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter task description (optional)"
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontSize: '14px',
                                resize: 'vertical',
                            }}
                        />
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end',
                    }}>
                        <Button
                            type="button"
                            size="md"
                            color="secondary"
                            onClick={onClose}
                            isDisabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="md"
                            color="primary"
                            isDisabled={loading || !title.trim()}
                            isLoading={loading}
                        >
                            Create Task
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function BoardView() {
    const { boardId } = useParams<{ boardId: string }>();
    const navigate = useNavigate();
    const [board, setBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [overColumnId, setOverColumnId] = useState<string | null>(null);
    const [wipWarning, setWipWarning] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [createTaskColumnId, setCreateTaskColumnId] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);

    const { tasks, loading: tasksLoading, error: tasksError, moveTask, refresh } = useTasks(board?.id || null);
    const { users } = useUsers();

    useBoardRealtime(
        board ? [board.id] : [],
        refresh,
    );

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

    useEffect(() => {
        if (!boardId) {
            navigate('/', { replace: true });
            return;
        }

        setLoading(true);
        setError(null);

        fetchBoardById(boardId)
            .then((data) => {
                setBoard(data);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to load board');
                if (err instanceof Error && err.message.includes('404')) {
                    setTimeout(() => navigate('/', { replace: true }), 2000);
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [boardId, navigate]);

    // Get unique users from tasks
    const boardUsers = useMemo(() => {
        if (!tasks.length || !users.length) return [];
        const uniqueOwnerIds = new Set(tasks.map(t => t.ownerId));
        return users.filter(u => uniqueOwnerIds.has(u.id)).slice(0, 7);
    }, [tasks, users]);

    // Get primary project from board (first project or most used)
    const primaryProject = useMemo(() => {
        if (!board?.projects || board.projects.length === 0) return null;
        if (selectedProject) {
            return board.projects.find(p => p.id === selectedProject);
        }
        // Find project with most tasks
        const projectTaskCounts = board.projects.map(project => ({
            project,
            count: tasks.filter(t => t.projectId === project.id).length,
        }));
        projectTaskCounts.sort((a, b) => b.count - a.count);
        return projectTaskCounts[0]?.project || board.projects[0];
    }, [board?.projects, tasks, selectedProject]);

    // Filter tasks by search query and project
    const filteredTasks = useMemo(() => {
        let filtered = tasks;
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(query) ||
                task.description?.toLowerCase().includes(query)
            );
        }

        if (selectedProject) {
            filtered = filtered.filter(task => task.projectId === selectedProject);
        }

        return filtered;
    }, [tasks, searchQuery, selectedProject]);

    // Group filtered tasks by column
    const tasksByColumn = useMemo(() => {
        if (!board) return {};
        const grouped: Record<string, Task[]> = {};
        for (const column of board.columns) {
            grouped[column.id] = [];
        }
        for (const task of filteredTasks) {
            if (grouped[task.columnId]) {
                grouped[task.columnId].push(task);
            }
        }
        // Sort tasks within each column by lastMovedAt
        for (const columnId of Object.keys(grouped)) {
            grouped[columnId].sort(
                (a, b) => new Date(a.lastMovedAt).getTime() - new Date(b.lastMovedAt).getTime()
            );
        }
        return grouped;
    }, [filteredTasks, board]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const task = tasks.find((t) => t.id === event.active.id);
        setActiveTask(task || null);
        setWipWarning(null);
    }, [tasks]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over } = event;
        if (!board || !over) {
            setOverColumnId(null);
            return;
        }

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
    }, [board, tasks]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        setOverColumnId(null);

        if (!board || !over) return;

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
                    `WIP limit reached for "${result.wipStatus.columnName}" (${result.wipStatus.currentCount}/${result.wipStatus.wipLimit}).`
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
    }, [board, tasks, moveTask]);

    const handleDragCancel = useCallback(() => {
        setActiveTask(null);
        setOverColumnId(null);
    }, []);

    // Sort columns by position
    const sortedColumns = useMemo(
        () => board ? [...board.columns].sort((a, b) => a.position - b.position) : [],
        [board]
    );

    // Export to CSV
    const handleExport = useCallback(() => {
        if (!board || !tasks.length) return;

        const headers = ['Title', 'Description', 'Column', 'Project', 'Status', 'Created', 'Updated'];
        const rows = tasks.map(task => [
            task.title,
            task.description || '',
            board.columns.find(c => c.id === task.columnId)?.name || '',
            task.project?.name || '',
            task.isDone ? 'Done' : 'Active',
            new Date(task.createdAt).toLocaleDateString(),
            new Date(task.updatedAt).toLocaleDateString(),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${board.name.replace(/[^a-z0-9]/gi, '_')}_tasks.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [board, tasks]);

    // Get user initials
    const getUserInitials = useCallback((user: { name?: string; email: string }) => {
        if (user.name) {
            const parts = user.name.split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return user.name.substring(0, 2).toUpperCase();
        }
        return user.email.substring(0, 2).toUpperCase();
    }, []);

    if (loading || !board) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: '#FFFFFF',
            }}>
                <p style={{ color: '#475569' }}>Loading board…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: '#FFFFFF',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ color: '#1E293B', fontSize: '24px', marginBottom: '8px' }}>Error Loading Board</h1>
                    <p style={{ color: '#475569' }}>{error}</p>
                    <Button size="md" color="primary" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>
                        ← Back to Home
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '0px',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            background: '#FFFFFF',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            position: 'fixed',
            top: 0,
            left: 0,
        }}>
            {/* Header Section */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                padding: '0px',
                width: '100%',
                flexShrink: 0,
            }}>
                {/* Top Bar */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '20px 32px',
                    gap: '10px',
                    width: '100%',
                    background: '#F8FAFC',
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: '0px',
                        gap: '16px',
                        width: '100%',
                    }}>
                        {/* Breadcrumbs */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: '0px',
                            gap: '8px',
                            flex: 1,
                        }}>
                            {/* Home icon */}
                            <Link to="/" style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '16px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '123px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                textDecoration: 'none',
                            }}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 3L3 10H6V17H9V13H11V17H14V10H17L10 3Z" fill="#475569" />
                                </svg>
                            </Link>
                            
                            {/* Breadcrumb items */}
                            <span style={{ color: '#CBD5E1', fontSize: '20px' }}>›</span>
                            <Link to="/" style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontStyle: 'normal',
                                fontWeight: 700,
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: '#475569',
                                textDecoration: 'none',
                            }}>Boards</Link>
                            
                            {primaryProject && (
                                <>
                                    <span style={{ color: '#CBD5E1', fontSize: '20px' }}>›</span>
                                    <span style={{
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        fontStyle: 'normal',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        lineHeight: '20px',
                                        color: '#475569',
                                    }}>Projects</span>
                                    <span style={{ color: '#CBD5E1', fontSize: '20px' }}>›</span>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: '#4F46E5',
                                        }} />
                                        <span style={{
                                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                                            fontStyle: 'normal',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            lineHeight: '20px',
                                            color: '#4F46E5',
                                        }}>{primaryProject.name}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right side buttons */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            padding: '0px',
                            gap: '8px',
                        }}>
                            {/* Search button */}
                            <button 
                                onClick={() => setShowSearch(!showSearch)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: '16px',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '123px',
                                    border: 'none',
                                    background: showSearch ? '#E2E8F0' : 'transparent',
                                    cursor: 'pointer',
                                }}
                            >
                                <SearchLg className="w-6 h-6" style={{ color: '#475569' }} />
                            </button>

                            {/* Search input (shown when active) */}
                            {showSearch && (
                                <div style={{
                                    position: 'absolute',
                                    top: '80px',
                                    right: '32px',
                                    zIndex: 100,
                                    background: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
                                    minWidth: '300px',
                                }}>
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search tasks..."
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Avatar group */}
                            {boardUsers.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                }}>
                                    {boardUsers.slice(0, 6).map((user, index) => (
                                        <div
                                            key={user.id}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '76.875px',
                                                border: '2px solid #FFFFFF',
                                                background: '#E0E7FF',
                                                marginLeft: index > 0 ? '-12px' : '0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                fontWeight: 700,
                                                fontSize: '12px',
                                                color: '#4F46E5',
                                                zIndex: boardUsers.length - index,
                                                position: 'relative',
                                            }}
                                            title={user.name || user.email}
                                        >
                                            {getUserInitials(user)}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Filter button */}
                            <button 
                                onClick={() => {
                                    if (selectedProject) {
                                        setSelectedProject(null);
                                    } else if (board.projects && board.projects.length > 0) {
                                        // Could open a filter menu here
                                        setSelectedProject(board.projects[0].id);
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: '10px 16px',
                                    gap: '8px',
                                    minWidth: '98px',
                                    height: '40px',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '1234px',
                                    background: selectedProject ? '#4F46E5' : '#FFFFFF',
                                    cursor: 'pointer',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    lineHeight: '20px',
                                    color: selectedProject ? '#FFFFFF' : '#475569',
                                }}
                            >
                                {selectedProject ? 'Clear Filter' : 'Filter'}
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M3 7h14M7 3v14m6-14v14" stroke={selectedProject ? '#FFFFFF' : '#475569'} strokeWidth="2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Board Header */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '32px',
                    gap: '16px',
                    width: '100%',
                    borderBottom: '1px solid #E2E8F0',
                }}>
                    {/* Logo Placeholder */}
                    <div style={{
                        width: '96px',
                        height: '96px',
                        background: '#E0E7FF',
                        borderRadius: '1234px',
                        position: 'relative',
                        flexShrink: 0,
                    }}>
                        <div style={{
                            position: 'absolute',
                            width: '64px',
                            height: '64px',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: '#4F46E5',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontWeight: 800,
                            fontSize: '24px',
                        }}>
                            {board.name.substring(0, 1).toUpperCase()}
                        </div>
                    </div>

                    {/* Title and Actions */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0px',
                        gap: '12px',
                        flex: 1,
                    }}>
                        {/* Title Row */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: '0px',
                            gap: '16px',
                            width: '100%',
                        }}>
                            <h1 style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontStyle: 'normal',
                                fontWeight: 800,
                                fontSize: '30px',
                                lineHeight: '38px',
                                letterSpacing: '-0.013em',
                                color: '#1E293B',
                                margin: 0,
                                flex: 1,
                            }}>
                                {board.name}
                            </h1>
                        </div>

                        {/* Tabs */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: '0px',
                            gap: '64px',
                            width: '100%',
                        }}>
                            <Tabs selectedKey="board" onSelectionChange={() => { }}>
                                <Tabs.List
                                    type="button-border"
                                    size="sm"
                                    items={[
                                        { id: 'board', label: 'Board' },
                                        { id: 'list', label: 'List' },
                                    ]}
                                >
                                    {(item) => <Tabs.Item id={item.id}>{item.label}</Tabs.Item>}
                                </Tabs.List>
                            </Tabs>

                            {/* Export button */}
                            <Button
                                size="md"
                                color="primary"
                                onClick={handleExport}
                            >
                                Export
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    padding: '32px',
                    gap: '24px',
                    width: '100%',
                    flex: 1,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    minHeight: 0,
                }}>
                    {sortedColumns.map((column) => {
                        const columnTasks = tasksByColumn[column.id] || [];
                        const taskCount = columnTasks.length;

                        // Get column dot color based on type
                        const getDotColor = () => {
                            if (column.type === 'DONE') return '#22C55E';
                            if (column.type === 'INPUT') return '#4F46E5';
                            if (column.name.toLowerCase().includes('progress')) return '#F59E0B';
                            return '#4F46E5';
                        };

                        const ColumnDroppable = ({ children }: { children: ReactNode }) => {
                            const { setNodeRef } = useDroppable({
                                id: column.id,
                            });

                            return (
                                <div
                                    ref={setNodeRef}
                                    style={{
                                        boxSizing: 'border-box',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        padding: '16px',
                                        gap: '10px',
                                        width: '416px',
                                        minWidth: '416px',
                                        flexShrink: 0,
                                        background: '#F8FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '32px',
                                        opacity: overColumnId === column.id ? 0.8 : 1,
                                        transition: 'opacity 0.2s',
                                    }}
                                >
                                    {children}
                                </div>
                            );
                        };

                        return (
                            <ColumnDroppable key={column.id}>
                                {/* Column Header */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: '0px',
                                    gap: '16px',
                                    width: '100%',
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: '0px',
                                        gap: '8px',
                                        flex: 1,
                                    }}>
                                        {/* Dot indicator */}
                                        <div style={{
                                            width: '10px',
                                            height: '10px',
                                            position: 'relative',
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                left: '10%',
                                                right: '10%',
                                                top: '10%',
                                                bottom: '10%',
                                                background: getDotColor(),
                                                borderRadius: '9999px',
                                            }} />
                                        </div>
                                        {/* Column title */}
                                        <h3 style={{
                                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                                            fontStyle: 'normal',
                                            fontWeight: 800,
                                            fontSize: '20px',
                                            lineHeight: '28px',
                                            letterSpacing: '-0.01em',
                                            color: '#1E293B',
                                            margin: 0,
                                            flex: 1,
                                        }}>
                                            {column.name} ({taskCount})
                                        </h3>
                                    </div>

                                    {/* Add button */}
                                    <button 
                                        onClick={() => setCreateTaskColumnId(column.id)}
                                        style={{
                                            boxSizing: 'border-box',
                                            display: 'flex',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            padding: '16px',
                                            width: '40px',
                                            height: '40px',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: '123px',
                                            background: '#FFFFFF',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path 
                                                d="M12 5V19M5 12H19" 
                                                stroke="#475569" 
                                                strokeWidth="2" 
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {/* Tasks Container */}
                                <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        padding: '0px',
                                        gap: '12px',
                                        width: '100%',
                                        maxHeight: 'calc(100vh - 400px)',
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                    }}>
                                        {columnTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedTaskId(task.id)}
                                                style={{
                                                    boxSizing: 'border-box',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    padding: '12px',
                                                    gap: '16px',
                                                    width: '100%',
                                                    background: '#FFFFFF',
                                                    border: '1px solid #E2E8F0',
                                                    borderRadius: '24px',
                                                    boxShadow: '0px 4px 8px -2px rgba(23, 23, 23, 0.1), 0px 2px 4px -2px rgba(23, 23, 23, 0.06)',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0px 6px 12px -2px rgba(23, 23, 23, 0.15), 0px 4px 6px -2px rgba(23, 23, 23, 0.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0px 4px 8px -2px rgba(23, 23, 23, 0.1), 0px 2px 4px -2px rgba(23, 23, 23, 0.06)';
                                                }}
                                            >
                                                <TaskCardNew task={task} onClick={() => setSelectedTaskId(task.id)} />
                                            </div>
                                        ))}
                                        {columnTasks.length === 0 && (
                                            <div style={{
                                                padding: '24px',
                                                textAlign: 'center',
                                                color: '#94A3B8',
                                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                fontSize: '14px',
                                                width: '100%',
                                            }}>
                                                No tasks yet. Click + to add one.
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                            </ColumnDroppable>
                        );
                    })}
                </div>

                <DragOverlay>
                    {activeTask ? (
                        <div style={{ transform: 'rotate(2deg)', opacity: 0.9 }}>
                            <TaskCardNew task={activeTask} isDragging />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Create Task Modal */}
            {createTaskColumnId && board && (
                <CreateTaskModal
                    board={board}
                    columnId={createTaskColumnId}
                    onClose={() => setCreateTaskColumnId(null)}
                    onCreate={() => {
                        refresh();
                        setCreateTaskColumnId(null);
                    }}
                />
            )}

            {/* Task Detail Modal */}
            {selectedTaskId && board && (
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

            {/* WIP Warning */}
            {wipWarning && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    padding: '16px 24px',
                    background: '#FFFBEB',
                    border: '1px solid #FCD34D',
                    borderRadius: '8px',
                    color: '#92400E',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '14px',
                    zIndex: 1000,
                }}>
                    {wipWarning}
                    <button
                        onClick={() => setWipWarning(null)}
                        style={{
                            marginLeft: '12px',
                            background: 'none',
                            border: 'none',
                            color: '#92400E',
                            cursor: 'pointer',
                            fontWeight: 700,
                        }}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}
