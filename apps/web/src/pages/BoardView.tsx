import { AppSidebar } from '@/components/AppSidebar';
import { ContextFilterBar } from '@/components/ContextFilterBar';
import { HintsPanel } from '@/components/HintsPanel';
import { ProjectFilter } from '@/components/ProjectFilter';
import { ProjectsManagement } from '@/components/ProjectsManagement';
import { SearchDialog } from '@/components/SearchDialog';
import { ShareDialog } from '@/components/ShareDialog';
import { BoardAnalytics } from '@/components/analytics/BoardAnalytics';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useBoardRealtime, type AgentProgress } from '@/hooks/useBoardRealtime';
import { useTasks } from '@/hooks/useTasks';
import { deleteBoard, fetchBoardById, fetchBoards, updateBoard } from '@/services/boards';
import { createColumn, deleteColumn, updateColumn } from '@/services/columns';
import { createTask, updateTask } from '@/services/tasks';
import type { Board, Column, ColumnType, Task, TaskContext, TaskPriority } from '@/services/types';
import { cn } from '@/utils/utils';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCorners,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactMarkdown from '@uiw/react-markdown-preview';
import MDEditor from '@uiw/react-md-editor';
import {
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    ChevronDown,
    CreditCard,
    Edit,
    GripVertical,
    HelpCircle,
    Home,
    Info,
    ListTodo,
    Loader2,
    MessageCircle,
    MoreVertical,
    Pencil,
    Plus,
    Puzzle,
    RefreshCw,
    Save,
    Search,
    Settings,
    Share2,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

// Rename Board Dialog
interface RenameBoardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    board: Board | null;
    onSuccess: () => void;
}

function RenameBoardDialog({ open, onOpenChange, board, onSuccess }: RenameBoardDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (board) {
            setName(board.name);
            setDescription(board.description || '');
        }
    }, [board]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!board || !name.trim()) {
            toast.error('Board name is required');
            return;
        }

        setLoading(true);
        try {
            await updateBoard(board.id, {
                name: name.trim(),
                description: description.trim() || null,
            });
            toast.success('Board updated successfully');
            onSuccess();
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update board');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename Board</DialogTitle>
                    <DialogDescription>Update the board name and description</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="board-name">Board Name *</Label>
                        <Input
                            id="board-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter board name"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="board-description">Description</Label>
                        <Textarea
                            id="board-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter board description (optional)"
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Create Column Dialog
interface CreateColumnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    board: Board | null;
    onSuccess: (column: Column) => void;
}

function CreateColumnDialog({ open, onOpenChange, board, onSuccess }: CreateColumnDialogProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<ColumnType>('CONTEXT');
    const [wipLimit, setWipLimit] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setName('');
            setType('CONTEXT');
            setWipLimit('');
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!board || !name.trim()) {
            toast.error('Column name is required');
            return;
        }

        setLoading(true);
        try {
            const newColumn = await createColumn(board.id, {
                name: name.trim(),
                type,
                wipLimit: wipLimit ? Number.parseInt(wipLimit, 10) : null,
            });
            console.log('Column created:', newColumn);
            toast.success('Column created successfully');
            onSuccess(newColumn);
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create column');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Column</DialogTitle>
                    <DialogDescription>Add a new column to this board</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="column-name">Column Name *</Label>
                        <Input
                            id="column-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter column name"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="column-type">Column Type</Label>
                        <Select
                            value={type}
                            onValueChange={(value) => setType(value as ColumnType)}
                        >
                            <SelectTrigger id="column-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INPUT">Input</SelectItem>
                                <SelectItem value="CLARIFY">Clarify</SelectItem>
                                <SelectItem value="CONTEXT">Context</SelectItem>
                                <SelectItem value="WAITING">Waiting</SelectItem>
                                <SelectItem value="SOMEDAY">Someday</SelectItem>
                                <SelectItem value="DONE">Done</SelectItem>
                                <SelectItem value="ARCHIVE">Archive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="wip-limit">WIP Limit (optional)</Label>
                        <Input
                            id="wip-limit"
                            type="number"
                            min="0"
                            value={wipLimit}
                            onChange={(e) => setWipLimit(e.target.value)}
                            placeholder="Leave empty for unlimited"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Column'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Edit Column Dialog
interface EditColumnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    column: Column | null;
    onSuccess: (column?: Column) => void;
}

function EditColumnDialog({ open, onOpenChange, column, onSuccess }: EditColumnDialogProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<ColumnType>('CONTEXT');
    const [wipLimit, setWipLimit] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (column) {
            setName(column.name);
            setType(column.type);
            setWipLimit(column.wipLimit?.toString() || '');
        } else {
            // Reset form when column is null
            setName('');
            setType('CONTEXT');
            setWipLimit('');
        }
    }, [column]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!column || !name.trim()) {
            toast.error('Column name is required');
            return;
        }

        setLoading(true);
        try {
            const updatedColumn = await updateColumn(column.id, {
                name: name.trim(),
                type,
                wipLimit: wipLimit ? Number.parseInt(wipLimit, 10) : null,
            });
            toast.success('Column updated successfully');
            onSuccess(updatedColumn);
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update column');
        } finally {
            setLoading(false);
        }
    };

    if (!column) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Column</DialogTitle>
                    <DialogDescription>Update column information</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-column-name">Column Name *</Label>
                        <Input
                            id="edit-column-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter column name"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-column-type">Column Type</Label>
                        <Select
                            value={type}
                            onValueChange={(value) => setType(value as ColumnType)}
                        >
                            <SelectTrigger id="edit-column-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INPUT">Input</SelectItem>
                                <SelectItem value="CLARIFY">Clarify</SelectItem>
                                <SelectItem value="CONTEXT">Context</SelectItem>
                                <SelectItem value="WAITING">Waiting</SelectItem>
                                <SelectItem value="SOMEDAY">Someday</SelectItem>
                                <SelectItem value="DONE">Done</SelectItem>
                                <SelectItem value="ARCHIVE">Archive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-wip-limit">WIP Limit (optional)</Label>
                        <Input
                            id="edit-wip-limit"
                            type="number"
                            min="0"
                            value={wipLimit}
                            onChange={(e) => setWipLimit(e.target.value)}
                            placeholder="Leave empty for unlimited"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Delete Column Dialog
interface DeleteColumnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    column: Column | null;
    onSuccess: (column?: Column) => void;
}

function DeleteColumnDialog({ open, onOpenChange, column, onSuccess }: DeleteColumnDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!column) return;

        setLoading(true);
        try {
            await deleteColumn(column.id);
            toast.success('Column deleted successfully');
            // Pass the deleted column so we can remove it from state immediately
            onSuccess(column);
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete column');
        } finally {
            setLoading(false);
        }
    };

    if (!column) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="size-5" />
                        Delete Column
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this column? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
                        <p className="text-sm font-medium text-destructive mb-2">
                            Warning: This action is irreversible
                        </p>
                        <p className="text-sm text-muted-foreground">
                            If this column contains tasks, you'll need to move or delete them first.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? 'Deleting...' : 'Delete Column'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Delete Board Dialog
interface DeleteBoardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    board: Board | null;
    onSuccess: () => void;
}

function DeleteBoardDialog({ open, onOpenChange, board, onSuccess }: DeleteBoardDialogProps) {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const boardName = board?.name || '';

    const handleDelete = async () => {
        if (!board) return;
        if (confirmText !== boardName) {
            toast.error(`Please type "${boardName}" to confirm deletion`);
            return;
        }

        setLoading(true);
        try {
            await deleteBoard(board.id);
            toast.success('Board deleted successfully');
            onSuccess();
            onOpenChange(false);

            // Refresh user to get updated defaultBoardId
            await refreshUser();

            // Navigate to default board or empty view
            if (user?.id) {
                try {
                    const boards = await fetchBoards(user.id);
                    if (boards.length > 0) {
                        // Navigate to default board (which should be set by backend) or first board
                        const defaultBoard =
                            boards.find((b) => b.id === user.defaultBoardId) || boards[0];
                        navigate(`/board/${defaultBoard.id}`, { replace: true });
                    } else {
                        // No boards left, navigate to empty view
                        navigate('/board/empty', { replace: true });
                    }
                } catch {
                    // If fetching boards fails, navigate to empty view
                    navigate('/board/empty', { replace: true });
                }
            } else {
                navigate('/board/empty', { replace: true });
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete board');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="size-5" />
                        Delete Board
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the board and all
                        its tasks, columns, and associated data.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
                        <p className="text-sm font-medium text-destructive mb-2">
                            Warning: This action is irreversible
                        </p>
                        <p className="text-sm text-muted-foreground">
                            All tasks, columns, projects, and other data associated with this board
                            will be permanently deleted.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-delete">
                            Type <span className="font-mono font-semibold">{boardName}</span> to
                            confirm:
                        </Label>
                        <Input
                            id="confirm-delete"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={boardName}
                            disabled={loading}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading || confirmText !== boardName}
                    >
                        {loading ? 'Deleting...' : 'Delete Board'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// SiteHeader Component (dashboard-01 style)
interface SiteHeaderProps {
    board: Board | null;
    onAddTask: (columnId: string) => void;
    onSearchClick: () => void;
    onShareClick: () => void;
    onRefresh?: () => void;
    onRenameClick?: () => void;
    onDeleteClick?: () => void;
    onAddColumnClick?: () => void;
}

function SiteHeader({
    board,
    onAddTask,
    onSearchClick,
    onShareClick,
    onRefresh,
    onRenameClick,
    onDeleteClick,
    onAddColumnClick,
}: SiteHeaderProps) {
    const navigate = useNavigate();

    const handleAddTask = () => {
        if (!board) return;

        // Find INPUT column or fall back to first column
        const inputColumn = board.columns.find((col) => col.type === 'INPUT');
        const targetColumn = inputColumn || board.columns[0];

        if (targetColumn) {
            onAddTask(targetColumn.id);
        }
    };

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
            toast.success('Board refreshed');
        }
    };

    const handleViewSettings = () => {
        navigate('/settings');
    };

    const handleBoardInfo = () => {
        if (!board) return;
        toast.info(
            <div className="space-y-1">
                <p className="font-semibold">{board.name}</p>
                {board.description && <p className="text-sm">{board.description}</p>}
                <p className="text-xs text-muted-foreground">{board.columns.length} columns</p>
            </div>,
            { duration: 3000 },
        );
    };

    return (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 h-4" />
                <h1 className="text-base font-medium">Kanban Dashboard</h1>
                <div className="ml-auto flex items-center gap-2">
                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={handleAddTask}
                        disabled={!board}
                    >
                        <Plus className="size-4" />
                        <span className="hidden sm:inline">New Task</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={onSearchClick}
                        title="Search tasks (Ctrl+K)"
                    >
                        <Search className="size-4" />
                    </Button>
                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={onShareClick}
                    >
                        <Share2 className="size-4" />
                        <span className="hidden sm:inline">Share</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="size-8">
                                <MoreVertical className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Board Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {onAddColumnClick && (
                                <DropdownMenuItem
                                    onClick={onAddColumnClick}
                                    className="cursor-pointer"
                                >
                                    <Plus className="size-4 mr-2" />
                                    Add Column
                                </DropdownMenuItem>
                            )}
                            {onRenameClick && (
                                <DropdownMenuItem
                                    onClick={onRenameClick}
                                    className="cursor-pointer"
                                >
                                    <Pencil className="size-4 mr-2" />
                                    Rename Board
                                </DropdownMenuItem>
                            )}
                            {onRefresh && (
                                <DropdownMenuItem
                                    onClick={handleRefresh}
                                    className="cursor-pointer"
                                >
                                    <RefreshCw className="size-4 mr-2" />
                                    Refresh Board
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                onClick={handleBoardInfo}
                                className="cursor-pointer"
                                disabled={!board}
                            >
                                <Info className="size-4 mr-2" />
                                Board Info
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={handleViewSettings}
                                className="cursor-pointer"
                            >
                                <Settings className="size-4 mr-2" />
                                View Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {onDeleteClick && (
                                <DropdownMenuItem
                                    onClick={onDeleteClick}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="size-4 mr-2" />
                                    Delete Board
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}

// Task Creation Dialog
interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    board: Board;
    columnId: string;
    onSuccess: (taskId?: string) => void;
}

function CreateTaskDialog({
    open,
    onOpenChange,
    board,
    columnId,
    onSuccess,
}: CreateTaskDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState<string>('');
    const [context, setContext] = useState<TaskContext | ''>('');
    const [waitingFor, setWaitingFor] = useState('');
    const [dueAt, setDueAt] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setLoading(true);
        try {
            const newTask = await createTask({
                boardId: board.id,
                columnId,
                ownerId: board.ownerId,
                title: title.trim(),
                description: description.trim() || undefined,
                projectId: projectId || undefined,
                context: context || undefined,
                waitingFor: waitingFor.trim() || undefined,
                dueAt: dueAt || undefined,
            });
            toast.success('Task created successfully');
            onSuccess(newTask.id);
            onOpenChange(false);
            // Reset form
            setTitle('');
            setDescription('');
            setProjectId('');
            setContext('');
            setWaitingFor('');
            setDueAt('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>Add a new task to this column</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task title"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter task description"
                            rows={4}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="project">Project</Label>
                            <Select
                                value={projectId || 'none'}
                                onValueChange={(value) =>
                                    setProjectId(value === 'none' ? '' : value)
                                }
                            >
                                <SelectTrigger id="project">
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {board.projects?.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="context">Context</Label>
                            <Select
                                value={context || 'none'}
                                onValueChange={(value) =>
                                    setContext(value === 'none' ? '' : (value as TaskContext))
                                }
                            >
                                <SelectTrigger id="context">
                                    <SelectValue placeholder="Select context" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="EMAIL">Email</SelectItem>
                                    <SelectItem value="MEETING">Meeting</SelectItem>
                                    <SelectItem value="PHONE">Phone</SelectItem>
                                    <SelectItem value="READ">Read</SelectItem>
                                    <SelectItem value="WATCH">Watch</SelectItem>
                                    <SelectItem value="DESK">Desk</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="waitingFor">Waiting For</Label>
                        <Input
                            id="waitingFor"
                            value={waitingFor}
                            onChange={(e) => setWaitingFor(e.target.value)}
                            placeholder="Who or what are you waiting for?"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dueAt">Due Date</Label>
                        <Input
                            id="dueAt"
                            type="datetime-local"
                            value={dueAt}
                            onChange={(e) => setDueAt(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Task Detail/Edit Dialog
interface TaskDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task | null;
    board: Board | null;
    onUpdate: () => void;
    onDelete: (taskId: string) => Promise<void>;
}

function TaskDetailDialog({
    open,
    onOpenChange,
    task,
    board,
    onUpdate,
    onDelete,
}: TaskDetailDialogProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [columnId, setColumnId] = useState('');
    const [projectId, setProjectId] = useState<string>('');
    const [context, setContext] = useState<TaskContext | ''>('');
    const [waitingFor, setWaitingFor] = useState('');
    const [dueAt, setDueAt] = useState('');
    const [priority, setPriority] = useState<TaskPriority | ''>('');
    const [duration, setDuration] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setColumnId(task.columnId);
            setProjectId(task.projectId || '');
            setContext(task.context || '');
            setWaitingFor(task.waitingFor || '');
            setDueAt(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '');
            setPriority(task.priority || '');
            setDuration(task.duration || '');
            setIsEditing(false);
        }
    }, [task]);

    const handleSave = async () => {
        if (!task || !title.trim()) {
            toast.error('Title is required');
            return;
        }

        setLoading(true);
        try {
            await updateTask(task.id, {
                title: title.trim(),
                description: description.trim() || undefined,
                columnId,
                projectId: projectId || undefined,
                context: context || undefined,
                waitingFor: waitingFor.trim() || undefined,
                dueAt: dueAt || undefined,
                priority: priority || undefined,
                duration: duration.trim() || undefined,
            });
            toast.success('Task updated successfully');
            setIsEditing(false);
            onUpdate();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update task');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!task) return;
        if (!confirm('Are you sure you want to delete this task?')) return;

        setLoading(true);
        try {
            await onDelete(task.id);
            toast.success('Task deleted');
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete task');
            // Don't close dialog on error - let user retry or cancel
        } finally {
            setLoading(false);
        }
    };

    if (!task || !board) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[80vw] w-[80vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>{isEditing ? 'Edit Task' : 'Task Details'}</span>
                        <div className="flex gap-2">
                            {!isEditing && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit className="size-4" />
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update task information' : 'View and manage task details'}
                    </DialogDescription>
                </DialogHeader>

                {isEditing ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-title">Title *</Label>
                            <Input
                                id="edit-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <div data-color-mode="light">
                                <MDEditor
                                    value={description}
                                    onChange={(value) => setDescription(value || '')}
                                    preview="live"
                                    hideToolbar={false}
                                    visibleDragbar={false}
                                    height={300}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-column">Column</Label>
                                <Select value={columnId} onValueChange={setColumnId}>
                                    <SelectTrigger id="edit-column">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {board.columns.map((col) => (
                                            <SelectItem key={col.id} value={col.id}>
                                                {col.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-project">Project</Label>
                                <Select
                                    value={projectId || 'none'}
                                    onValueChange={(value) =>
                                        setProjectId(value === 'none' ? '' : value)
                                    }
                                >
                                    <SelectTrigger id="edit-project">
                                        <SelectValue placeholder="Select project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {board.projects?.map((project) => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-context">Context</Label>
                                <Select
                                    value={context || 'none'}
                                    onValueChange={(value) =>
                                        setContext(value === 'none' ? '' : (value as TaskContext))
                                    }
                                >
                                    <SelectTrigger id="edit-context">
                                        <SelectValue placeholder="Select context" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="EMAIL">Email</SelectItem>
                                        <SelectItem value="MEETING">Meeting</SelectItem>
                                        <SelectItem value="PHONE">Phone</SelectItem>
                                        <SelectItem value="READ">Read</SelectItem>
                                        <SelectItem value="WATCH">Watch</SelectItem>
                                        <SelectItem value="DESK">Desk</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-dueAt">Due Date</Label>
                                <Input
                                    id="edit-dueAt"
                                    type="datetime-local"
                                    value={dueAt}
                                    onChange={(e) => setDueAt(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-waitingFor">Waiting For</Label>
                            <Input
                                id="edit-waitingFor"
                                value={waitingFor}
                                onChange={(e) => setWaitingFor(e.target.value)}
                                placeholder="Who or what are you waiting for?"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-priority">Priority</Label>
                                <Select
                                    value={priority || 'none'}
                                    onValueChange={(value) =>
                                        setPriority(value === 'none' ? '' : (value as TaskPriority))
                                    }
                                >
                                    <SelectTrigger id="edit-priority">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-duration">Duration</Label>
                                <Input
                                    id="edit-duration"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    placeholder="e.g., 30 minutes, 2 hours"
                                />
                            </div>
                        </div>
                        <Separator />
                        <HintsPanel taskId={task.id} onHintApplied={onUpdate} />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleSave} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                                Title
                            </Label>
                            <p className="text-base font-semibold mt-1">{task.title}</p>
                        </div>
                        {task.description && (
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                    Description
                                </Label>
                                <div className="mt-1" data-color-mode="light">
                                    <ReactMarkdown source={task.description} />
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                    Column
                                </Label>
                                <p className="text-base mt-1">{task.column?.name || 'Unknown'}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                    Project
                                </Label>
                                <p className="text-base mt-1">{task.project?.name || 'None'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                    Context
                                </Label>
                                <p className="text-base mt-1">{task.context || 'None'}</p>
                            </div>
                            {task.dueAt && (
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">
                                        Due Date
                                    </Label>
                                    <p className="text-base mt-1 flex items-center gap-2">
                                        <Calendar className="size-4" />
                                        {new Date(task.dueAt).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                        {task.waitingFor && (
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                    Waiting For
                                </Label>
                                <p className="text-base mt-1">{task.waitingFor}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            {task.priority && (
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">
                                        Priority
                                    </Label>
                                    <p className="text-base mt-1">
                                        <Badge
                                            variant={
                                                task.priority === 'HIGH'
                                                    ? 'destructive'
                                                    : task.priority === 'MEDIUM'
                                                        ? 'default'
                                                        : 'secondary'
                                            }
                                        >
                                            {task.priority}
                                        </Badge>
                                    </p>
                                </div>
                            )}
                            {task.duration && (
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">
                                        Duration
                                    </Label>
                                    <p className="text-base mt-1">{task.duration}</p>
                                </div>
                            )}
                        </div>
                        {task.tags && task.tags.length > 0 && (
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                    Tags
                                </Label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {task.tags.map(({ tag }) => (
                                        <Badge key={tag.id} variant="secondary">
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {task.checklist && task.checklist.length > 0 && (
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                    Checklist
                                </Label>
                                <div className="space-y-2 mt-1">
                                    {task.checklist.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2">
                                            <CheckCircle2
                                                className={cn(
                                                    'size-4',
                                                    item.isDone
                                                        ? 'text-green-500'
                                                        : 'text-slate-400',
                                                )}
                                            />
                                            <span
                                                className={cn(
                                                    item.isDone &&
                                                    'line-through text-muted-foreground',
                                                )}
                                            >
                                                {item.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Separator />
                        <HintsPanel taskId={task.id} onHintApplied={onUpdate} />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Draggable Task Card Component
interface DraggableTaskCardProps {
    task: Task;
    onTaskClick?: (task: Task) => void;
    isProcessing?: boolean;
    progress?: AgentProgress;
}

function DraggableTaskCard({ task, onTaskClick, isProcessing = false, progress }: DraggableTaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getPriorityColor = (): 'indigo' | 'amber' | 'green' | 'rose' | 'slate' => {
        if (task.tags && task.tags.length > 0) {
            const tag = task.tags[0].tag;
            if (tag.color) {
                if (tag.color.includes('red') || tag.color.includes('rose')) return 'rose';
                if (tag.color.includes('amber') || tag.color.includes('yellow')) return 'amber';
                if (tag.color.includes('green')) return 'green';
                if (tag.color.includes('indigo') || tag.color.includes('blue')) return 'indigo';
            }
        }
        if (task.stale) return 'rose';
        if (task.isDone) return 'green';
        return 'slate';
    };

    const priorityColor = getPriorityColor();
    const priority = task.tags?.[0]?.tag?.name || (task.stale ? 'Stale' : 'Normal');

    const colorMap = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-500' },
        green: { bg: 'bg-green-50', text: 'text-green-500' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-500' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-600' },
    };

    const colors = colorMap[priorityColor];
    const comments = (task.metadata?.comments as number) || 0;
    const checkmarks = task.checklist?.filter((item) => item.isDone).length || 0;
    const totalCheckmarks = task.checklist?.length || 0;

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="w-full">
            <Card
                className="group bg-white border border-slate-200/80 relative rounded-2xl shrink-0 w-full cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all duration-200 overflow-hidden"
                onClick={() => onTaskClick?.(task)}
            >
                <div className="flex flex-col p-4 gap-3 w-full">
                    {/* Header: Priority badge and drag handle */}
                    <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    colors.bg,
                                    'inline-flex items-center justify-center px-2.5 py-1 rounded-full shrink-0',
                                )}
                            >
                                <span
                                    className={cn('font-semibold text-xs leading-tight', colors.text)}
                                >
                                    {priority}
                                </span>
                            </div>
                            {isProcessing && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-50 border border-indigo-200">
                                    <Loader2 className="size-3 text-indigo-600 animate-spin" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-indigo-600">
                                            {progress?.message || 'Processing...'}
                                        </span>
                                        {progress && (
                                            <div className="w-full bg-indigo-200 rounded-full h-1 mt-1">
                                                <div
                                                    className="bg-indigo-600 h-1 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress.progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            {...listeners}
                            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 transition-opacity"
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GripVertical className="size-4" />
                        </button>
                    </div>

                    {/* Content: Title and description */}
                    <div className="flex flex-col gap-1.5 w-full">
                        <h3 className="font-semibold text-sm leading-5 text-slate-900 line-clamp-2">
                            {task.title}
                        </h3>
                        {task.description && (
                            <p className="text-xs leading-5 text-slate-500 line-clamp-2">
                                {task.description}
                            </p>
                        )}
                    </div>

                    {/* Footer: Avatar and metadata */}
                    <div className="flex items-center justify-between gap-2 w-full pt-1">
                        <div className="flex items-center gap-2">
                            <Avatar className="size-7 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-medium">
                                    {task.ownerId.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex items-center gap-3">
                            {comments > 0 && (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <MessageCircle className="size-3.5" />
                                    <span className="text-xs font-medium">{comments}</span>
                                </div>
                            )}
                            {totalCheckmarks > 0 && (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <CheckCircle2
                                        className={cn(
                                            'size-3.5',
                                            checkmarks === totalCheckmarks && 'text-green-500',
                                        )}
                                    />
                                    <span className="text-xs font-medium">
                                        {checkmarks}/{totalCheckmarks}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

// KanbanActionButton Component
interface KanbanActionButtonProps {
    column: Column;
    taskCount: number;
    onAddTask: () => void;
}

function KanbanActionButton({ column, taskCount, onAddTask }: KanbanActionButtonProps) {
    const getStateFromColumn = (type: Column['type']): 'In Progress' | 'Reviewed' | 'Completed' => {
        if (type === 'DONE' || type === 'ARCHIVE') return 'Completed';
        if (type === 'CLARIFY') return 'Reviewed';
        return 'In Progress';
    };

    const state = getStateFromColumn(column.type);
    const colors = {
        'In Progress': { bg: 'bg-indigo-600', text: 'text-white', badge: 'text-indigo-600' },
        Reviewed: { bg: 'bg-amber-500', text: 'text-white', badge: 'text-amber-500' },
        Completed: { bg: 'bg-green-500', text: 'text-white', badge: 'text-green-500' },
    };
    const color = colors[state];
    const displayName = column.name || state;

    return (
        <button
            type="button"
            className={cn(
                color.bg,
                'box-border flex gap-3 items-center pl-2 pr-3 py-2 relative rounded-full shrink-0 w-full cursor-pointer hover:opacity-90 transition-opacity',
            )}
            onClick={onAddTask}
        >
            <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                <div className="bg-white box-border flex gap-2 items-center justify-center overflow-clip px-3 py-1.5 relative rounded-[1234px] shrink-0">
                    <p
                        className={cn(
                            'font-semibold leading-5 relative shrink-0 text-sm text-center whitespace-pre',
                            color.badge,
                        )}
                    >
                        {taskCount}
                    </p>
                </div>
                <p
                    className={cn(
                        'basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base',
                        color.text,
                    )}
                >
                    {displayName}
                </p>
            </div>
            <Plus className={cn('relative shrink-0 size-6', color.text)} />
        </button>
    );
}

// Droppable Kanban Column Component
interface KanbanColumnProps {
    column: Column;
    tasks: Task[];
    onAddTask: (columnId: string) => void;
    onTaskClick?: (task: Task) => void;
    onEditColumn?: (column: Column) => void;
    onDeleteColumn?: (column: Column) => void;
    processingTaskIds?: Set<string>;
    taskProgress?: Map<string, AgentProgress>;
}

function KanbanColumn({
    column,
    tasks,
    onAddTask,
    onTaskClick,
    onEditColumn,
    onDeleteColumn,
    processingTaskIds = new Set(),
    taskProgress = new Map(),
}: KanbanColumnProps) {
    const taskCount = tasks.length;
    const wipLimit = column.wipLimit ?? null;
    const isAtLimit = wipLimit !== null && taskCount >= wipLimit;
    const taskIds = tasks.map((t) => t.id);

    // Make the column a droppable area
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'basis-0 bg-slate-50 box-border flex gap-2.5 grow items-start min-h-px min-w-px overflow-clip p-3 relative rounded-[32px] shrink-0 min-h-[400px] transition-colors group',
                isOver && 'bg-indigo-50 border-2 border-indigo-300 border-dashed',
            )}
        >
            <div className="basis-0 flex flex-col gap-4 grow items-start min-h-px min-w-px relative shrink-0 w-full">
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                        <KanbanActionButton
                            column={column}
                            taskCount={taskCount}
                            onAddTask={() => onAddTask(column.id)}
                        />
                    </div>
                    {(onEditColumn || onDeleteColumn) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <MoreVertical className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Column Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {onEditColumn && (
                                    <DropdownMenuItem
                                        onClick={() => onEditColumn(column)}
                                        className="cursor-pointer"
                                    >
                                        <Edit className="size-4 mr-2" />
                                        Edit Column
                                    </DropdownMenuItem>
                                )}
                                {onDeleteColumn && (
                                    <DropdownMenuItem
                                        onClick={() => onDeleteColumn(column)}
                                        className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="size-4 mr-2" />
                                        Delete Column
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                {isAtLimit && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-full">
                        <p className="text-xs text-amber-700 font-medium">
                            WIP Limit: {taskCount}/{wipLimit}
                        </p>
                    </div>
                )}
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-3 items-start relative shrink-0 w-full min-h-[200px]">
                        {tasks.length === 0 ? (
                            <div
                                className={cn(
                                    'text-center text-slate-400 text-sm py-8 w-full rounded-lg border-2 border-dashed transition-colors',
                                    isOver
                                        ? 'border-indigo-300 bg-indigo-50/50'
                                        : 'border-transparent',
                                )}
                            >
                                {isOver ? 'Drop task here' : 'No tasks'}
                            </div>
                        ) : (
                            tasks.map((task) => (
                                <DraggableTaskCard
                                    key={task.id}
                                    task={task}
                                    onTaskClick={onTaskClick}
                                    isProcessing={processingTaskIds.has(task.id)}
                                    progress={taskProgress?.get(task.id)}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

// Main BoardView Component with all features
export function BoardView() {
    const { boardId } = useParams<{ boardId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const location = useLocation();

    // Check route for filter tabs
    const getInitialTab = (pathname: string) => {
        if (pathname.endsWith('/stale')) return 'Stale Tasks';
        if (pathname.endsWith('/someday')) return 'Someday';
        if (pathname.endsWith('/waiting')) return 'Waiting';
        if (pathname.endsWith('/projects')) return 'Projects';
        if (pathname.endsWith('/analytics')) return 'Analytics';
        return 'By Total Tasks';
    };
    const [activeTab, setActiveTab] = useState(() => getInitialTab(location.pathname));
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
    const [board, setBoard] = useState<Board | null>(null);
    const [loadingBoard, setLoadingBoard] = useState(true);
    const [boardError, setBoardError] = useState<string | null>(null);

    // Update activeTab when route changes
    useEffect(() => {
        setActiveTab(getInitialTab(location.pathname));
    }, [location.pathname]);
    const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
    const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
    const [showTaskDialog, setShowTaskDialog] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const selectedTaskIdRef = useRef<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    // Track tasks that are being processed (waiting for hints)
    const [processingTaskIds, setProcessingTaskIds] = useState<Set<string>>(new Set());
    // Track agent progress for each task
    const [taskProgress, setTaskProgress] = useState<Map<string, AgentProgress>>(new Map());
    const [showSearchDialog, setShowSearchDialog] = useState(false);
    const [selectedContexts, setSelectedContexts] = useState<Set<TaskContext>>(new Set());
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCreateColumnDialog, setShowCreateColumnDialog] = useState(false);
    const [showEditColumnDialog, setShowEditColumnDialog] = useState(false);
    const [showDeleteColumnDialog, setShowDeleteColumnDialog] = useState(false);
    const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    // Fetch board data
    const loadBoard = useCallback(async () => {
        if (!boardId) {
            setBoardError('Board ID is required');
            setLoadingBoard(false);
            return;
        }

        setLoadingBoard(true);
        setBoardError(null);
        try {
            const boardData = await fetchBoardById(boardId);
            if (!boardData) {
                throw new Error('Board not found');
            }
            // Ensure columns array exists
            if (!boardData.columns) {
                boardData.columns = [];
            }
            setBoard(boardData);
        } catch (err) {
            setBoardError(err instanceof Error ? err.message : 'Failed to load board');
            // If board not found, redirect to default board or empty view
            if (user?.id) {
                try {
                    const boards = await fetchBoards(user.id);
                    if (boards.length > 0) {
                        // Redirect to default board or first board
                        const defaultBoard =
                            boards.find((b) => b.id === user.defaultBoardId) || boards[0];
                        navigate(`/board/${defaultBoard.id}`, { replace: true });
                        return;
                    }
                    // No boards, redirect to empty view
                    navigate('/board/empty', { replace: true });
                    return;
                } catch {
                    // If fetching boards fails, show error
                    toast.error('Failed to load board');
                }
            }
            toast.error('Failed to load board');
        } finally {
            setLoadingBoard(false);
        }
    }, [boardId, user, navigate]);

    useEffect(() => {
        loadBoard();
    }, [loadBoard]);

    const refreshBoard = useCallback(() => {
        loadBoard();
    }, [loadBoard]);

    // Use tasks hook
    const {
        tasks,
        loading: loadingTasks,
        error: tasksError,
        moveTask,
        deleteTask,
        refresh: refreshTasks,
    } = useTasks(boardId || null);

    // Handle task query parameter to auto-open task dialog
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const taskId = searchParams.get('task');

        if (taskId && tasks && tasks.length > 0 && !showTaskDialog) {
            const task = tasks.find((t) => t.id === taskId);
            if (task) {
                setSelectedTask(task);
                setShowTaskDialog(true);
                // Remove the task query parameter from URL without reloading
                const newSearchParams = new URLSearchParams(location.search);
                newSearchParams.delete('task');
                const newSearch = newSearchParams.toString();
                navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, {
                    replace: true,
                });
            }
        }
    }, [tasks, location.search, location.pathname, navigate, showTaskDialog]);

    // Keyboard shortcut for search (Cmd/Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearchDialog(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Real-time updates
    useBoardRealtime(boardId ? [boardId] : [], {
        onUpdate: useCallback(() => {
            refreshTasks();
            if (boardId) {
                fetchBoardById(boardId)
                    .then((updatedBoard) => {
                        setBoard(updatedBoard);
                        // Dispatch custom event to notify other components (like AppSidebar)
                        window.dispatchEvent(
                            new CustomEvent('board:updated', { detail: { boardId } }),
                        );
                    })
                    .catch(console.error);
            }
        }, [boardId, refreshTasks]),
        onAgentProgress: useCallback((taskId: string, progress: AgentProgress) => {
            // Update progress state
            setTaskProgress((prev) => {
                const next = new Map(prev);
                next.set(taskId, progress);
                return next;
            });
            // Add to processing set if not already there
            setProcessingTaskIds((prev) => {
                if (prev.has(taskId)) return prev;
                const next = new Set(prev);
                next.add(taskId);
                return next;
            });
            // Show toast for important stages
            if (progress.stage === 'completed') {
                toast.success('Agent processing completed for task');
            } else if (progress.stage === 'error') {
                toast.error(`Agent processing error: ${progress.message}`);
            }
        }, []),
        onAgentCompleted: useCallback(
            (taskId: string, data: { processingTimeMs: number; successfulAgents: number; errors?: string[] }) => {
                // Remove from processing set
                setProcessingTaskIds((prev) => {
                    const next = new Set(prev);
                    next.delete(taskId);
                    return next;
                });
                // Clear progress
                setTaskProgress((prev) => {
                    const next = new Map(prev);
                    next.delete(taskId);
                    return next;
                });
                // Refresh tasks to get updated data with hints
                refreshTasks();
                // Update selected task if it's the one that was processed
                if (selectedTask?.id === taskId) {
                    refreshTasks().then(() => {
                        // Task will be updated in the useEffect below
                    });
                }
                // Show success message
                const timeSeconds = (data.processingTimeMs / 1000).toFixed(1);
                toast.success(
                    `Processing complete! ${data.successfulAgents} agent(s) processed in ${timeSeconds}s`,
                );
            },
            [selectedTask?.id, refreshTasks],
        ),
    });

    // Update selectedTask when tasks are refreshed (e.g., after hint is applied)
    useEffect(() => {
        const taskId = selectedTaskIdRef.current;
        if (taskId && tasks && tasks.length > 0) {
            const updatedTask = tasks.find((t) => t.id === taskId);
            if (updatedTask) {
                setSelectedTask(updatedTask);
            }
        }
    }, [tasks]);

    // Keep ref in sync with selectedTask
    useEffect(() => {
        selectedTaskIdRef.current = selectedTask?.id ?? null;
    }, [selectedTask]);

    // Check for hints and remove from processing set when hints arrive
    useEffect(() => {
        if (tasks && tasks.length > 0 && processingTaskIds.size > 0) {
            setProcessingTaskIds((prev) => {
                const next = new Set(prev);
                tasks.forEach((task) => {
                    // If task has hints, remove from processing set
                    if (task.hints && task.hints.length > 0 && next.has(task.id)) {
                        next.delete(task.id);
                    }
                });
                return next;
            });
        }
    }, [tasks, processingTaskIds.size]);

    // Filter and sort tasks based on activeTab
    const filteredAndSortedTasks = useMemo(() => {
        if (!tasks) return [];

        let filtered = [...tasks];

        // Filter by tab
        switch (activeTab) {
            case 'By Status':
                // Show all tasks
                break;
            case 'By Total Tasks':
                // Show all tasks
                break;
            case 'Tasks Due':
                filtered = filtered.filter(
                    (task) => task.dueAt && new Date(task.dueAt) > new Date(),
                );
                break;
            case 'Extra Tasks':
                // Tasks that exceed WIP limits or are in wrong columns
                filtered = filtered.filter((task) => {
                    const column = board?.columns.find((c) => c.id === task.columnId);
                    if (!column || !column.wipLimit) return false;
                    const columnTasks = tasks.filter((t) => t.columnId === column.id);
                    return columnTasks.length > column.wipLimit;
                });
                break;
            case 'Tasks Completed':
                filtered = filtered.filter((task) => task.isDone);
                break;
            case 'Stale Tasks':
                filtered = filtered.filter((task) => task.stale);
                break;
            case 'Someday':
                // Tasks in SOMEDAY columns
                filtered = filtered.filter((task) => {
                    const column = board?.columns.find((c) => c.id === task.columnId);
                    return column?.type === 'SOMEDAY';
                });
                break;
            case 'Waiting':
                // Tasks in WAITING columns OR tasks with waitingFor field set
                filtered = filtered.filter((task) => {
                    const column = board?.columns.find((c) => c.id === task.columnId);
                    return column?.type === 'WAITING' || !!task.waitingFor;
                });
                break;
            case 'Projects':
                // Tasks that have a project assigned
                filtered = filtered.filter((task) => !!task.projectId);
                break;
        }

        // Filter by selected contexts
        if (selectedContexts.size > 0) {
            filtered = filtered.filter(
                (task) => task.context && selectedContexts.has(task.context),
            );
        }

        // Filter by selected project
        if (selectedProjectId) {
            filtered = filtered.filter((task) => task.projectId === selectedProjectId);
        }

        // Sort tasks
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.lastMovedAt).getTime() - new Date(a.lastMovedAt).getTime();
                case 'oldest':
                    return new Date(a.lastMovedAt).getTime() - new Date(b.lastMovedAt).getTime();
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [tasks, activeTab, sortBy, board, selectedContexts, selectedProjectId]);

    // Group tasks by column
    const tasksByColumn = useMemo(() => {
        if (!board || !board.columns) return new Map<string, Task[]>();

        const map = new Map<string, Task[]>();
        for (const col of board.columns) {
            map.set(col.id, []);
        }

        for (const task of filteredAndSortedTasks) {
            const columnTasks = map.get(task.columnId) || [];
            columnTasks.push(task);
            map.set(task.columnId, columnTasks);
        }

        return map;
    }, [board, filteredAndSortedTasks]);

    // Get sorted columns
    const sortedColumns = useMemo(() => {
        if (!board || !board.columns) {
            console.log('sortedColumns: board or columns is null/undefined', {
                board: !!board,
                columns: board?.columns?.length,
            });
            return [];
        }
        const sorted = [...board.columns].sort((a, b) => a.position - b.position);
        console.log(
            'sortedColumns calculated:',
            sorted.length,
            sorted.map((c) => c.name),
        );
        return sorted;
    }, [board]);

    // Handle creating a new task
    const handleAddTask = useCallback((columnId: string) => {
        setSelectedColumnId(columnId);
        setShowCreateTaskDialog(true);
    }, []);

    // Handle task click
    const handleTaskClick = useCallback((task: Task) => {
        setSelectedTask(task);
        setShowTaskDialog(true);
    }, []);

    // Handle context filter toggle
    const handleContextToggle = useCallback((context: TaskContext) => {
        setSelectedContexts((prev) => {
            const next = new Set(prev);
            if (next.has(context)) {
                next.delete(context);
            } else {
                next.add(context);
            }
            return next;
        });
    }, []);

    // Handle clear context filters
    const handleClearContextFilters = useCallback(() => {
        setSelectedContexts(new Set());
    }, []);

    // Handle board rename success
    const handleBoardRenameSuccess = useCallback(() => {
        if (boardId) {
            fetchBoardById(boardId)
                .then((updatedBoard) => {
                    setBoard(updatedBoard);
                    // Dispatch custom event to notify other components (like AppSidebar) to refresh
                    window.dispatchEvent(new CustomEvent('board:updated', { detail: { boardId } }));
                })
                .catch(console.error);
        }
    }, [boardId]);

    // Handle board delete success (navigate handled in dialog)
    const handleBoardDeleteSuccess = useCallback(() => {
        // Navigation is handled in the DeleteBoardDialog component
    }, []);

    // Handle column create/edit/delete success
    const handleColumnSuccess = useCallback(
        (column?: Column, operation: 'create' | 'update' | 'delete' = 'create') => {
            if (!column) {
                console.warn('handleColumnSuccess called without column');
                return;
            }

            console.log('handleColumnSuccess called:', { column, operation });

            // Optimistically update the board state immediately
            setBoard((prevBoard) => {
                if (!prevBoard) {
                    console.warn('handleColumnSuccess: prevBoard is null');
                    return prevBoard;
                }
                const currentColumns = prevBoard.columns || [];
                console.log('Current columns before update:', currentColumns.length);

                if (operation === 'create') {
                    // Add new column and sort by position
                    const newColumns = [...currentColumns, column].sort(
                        (a, b) => a.position - b.position,
                    );
                    console.log('New columns after create:', newColumns.length);
                    return {
                        ...prevBoard,
                        columns: newColumns,
                    };
                }
                if (operation === 'update') {
                    // Update existing column
                    const updatedColumns = currentColumns
                        .map((c) => (c.id === column.id ? column : c))
                        .sort((a, b) => a.position - b.position);
                    return {
                        ...prevBoard,
                        columns: updatedColumns,
                    };
                }
                if (operation === 'delete') {
                    // Remove deleted column
                    return {
                        ...prevBoard,
                        columns: currentColumns.filter((c) => c.id !== column.id),
                    };
                }
                return prevBoard;
            });

            // Then refresh the board to ensure we have the latest data (with a delay to let the optimistic update render first)
            if (boardId) {
                // Delay the refresh to allow the optimistic update to render
                setTimeout(() => {
                    fetchBoardById(boardId)
                        .then((updatedBoard) => {
                            if (updatedBoard) {
                                // Ensure columns array exists
                                if (!updatedBoard.columns) {
                                    updatedBoard.columns = [];
                                }
                                setBoard(updatedBoard);
                                window.dispatchEvent(
                                    new CustomEvent('board:updated', { detail: { boardId } }),
                                );
                            }
                        })
                        .catch((err) => {
                            console.error('Failed to refresh board after column operation:', err);
                            toast.error('Failed to refresh board');
                        });
                }, 500);
            }
        },
        [boardId],
    );

    // Handle edit column
    const handleEditColumn = useCallback((column: Column) => {
        setSelectedColumn(column);
        setShowEditColumnDialog(true);
    }, []);

    // Handle delete column
    const handleDeleteColumn = useCallback((column: Column) => {
        setSelectedColumn(column);
        setShowDeleteColumnDialog(true);
    }, []);

    // Handle drag start
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    // Handle drag end
    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveId(null);

            if (!over) return;

            const taskId = active.id as string;
            const targetId = over.id as string;

            // Check if dropping on a column
            const isColumn = board?.columns.some((col) => col.id === targetId);

            if (isColumn) {
                // Dropping on a column - move task to that column (at the end)
                const currentTask = tasks?.find((t) => t.id === taskId);
                if (!currentTask) return;

                if (currentTask.columnId === targetId) {
                    // Already in the same column, no need to move
                    return;
                }

                try {
                    const result = await moveTask(taskId, targetId);
                    if (!result.success && result.wipStatus?.atLimit) {
                        toast.warning(`WIP limit reached for ${result.wipStatus.columnName}`);
                    } else {
                        toast.success('Task moved');
                    }
                } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to move task');
                }
            } else {
                // Dropping on another task - find which column that task is in
                const targetTask = tasks?.find((t) => t.id === targetId);
                if (!targetTask) return;

                const currentTask = tasks?.find((t) => t.id === taskId);
                if (!currentTask) return;

                const isSameColumn = currentTask.columnId === targetTask.columnId;

                if (isSameColumn) {
                    // Reordering within the same column
                    const columnTasks = tasksByColumn.get(targetTask.columnId) || [];
                    const currentIndex = columnTasks.findIndex((t) => t.id === taskId);
                    const targetIndex = columnTasks.findIndex((t) => t.id === targetId);

                    if (currentIndex === -1 || targetIndex === -1) return;

                    // Calculate new position based on target task's position
                    // Use the target task's position value from the database
                    let newPosition: number;
                    if (currentIndex < targetIndex) {
                        // Dragging down: place at target's position (will shift target and others down)
                        newPosition = targetTask.position;
                    } else {
                        // Dragging up: place at target's position (will shift target and others down)
                        newPosition = targetTask.position;
                    }

                    try {
                        const result = await moveTask(
                            taskId,
                            targetTask.columnId,
                            false,
                            newPosition,
                        );
                        if (!result.success && result.wipStatus?.atLimit) {
                            toast.warning(`WIP limit reached for ${result.wipStatus.columnName}`);
                        } else {
                            toast.success('Task reordered');
                        }
                    } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to reorder task');
                    }
                } else {
                    // Moving to a different column
                    try {
                        const result = await moveTask(taskId, targetTask.columnId);
                        if (!result.success && result.wipStatus?.atLimit) {
                            toast.warning(`WIP limit reached for ${result.wipStatus.columnName}`);
                        } else {
                            toast.success('Task moved');
                        }
                    } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to move task');
                    }
                }
            }
        },
        [moveTask, board, tasks, tasksByColumn],
    );

    // Handle drag over (for visual feedback)
    const handleDragOver = useCallback((event: DragOverEvent) => {
        // Can add visual feedback here if needed
    }, []);

    // Get active task for drag overlay
    const activeTask = useMemo(() => {
        if (!activeId) return null;
        return tasks?.find((t) => t.id === activeId) || null;
    }, [activeId, tasks]);

    // Loading state
    if (loadingBoard || loadingTasks) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-8 animate-spin text-indigo-600" />
                    <p className="text-slate-600">Loading board...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (boardError || tasksError || !board) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <AlertCircle className="size-8 text-red-500" />
                    <p className="text-slate-600">
                        {boardError || tasksError || 'Board not found'}
                    </p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={true}>
            <BoardViewContent
                boardId={boardId}
                board={board}
                handleAddTask={handleAddTask}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                navigate={navigate}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortedColumns={sortedColumns}
                tasksByColumn={tasksByColumn}
                sensors={sensors}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                handleDragOver={handleDragOver}
                handleTaskClick={handleTaskClick}
                activeTask={activeTask}
                showCreateTaskDialog={showCreateTaskDialog}
                setShowCreateTaskDialog={setShowCreateTaskDialog}
                selectedColumnId={selectedColumnId}
                refreshTasks={refreshTasks}
                processingTaskIds={processingTaskIds}
                setProcessingTaskIds={setProcessingTaskIds}
                taskProgress={taskProgress}
                showTaskDialog={showTaskDialog}
                setShowTaskDialog={setShowTaskDialog}
                selectedTask={selectedTask}
                deleteTask={deleteTask}
                filteredAndSortedTasks={filteredAndSortedTasks}
                showSearchDialog={showSearchDialog}
                setShowSearchDialog={setShowSearchDialog}
                tasks={tasks || []}
                selectedContexts={selectedContexts}
                onContextToggle={handleContextToggle}
                onClearContextFilters={handleClearContextFilters}
                showShareDialog={showShareDialog}
                setShowShareDialog={setShowShareDialog}
                selectedProjectId={selectedProjectId}
                onProjectChange={setSelectedProjectId}
                showRenameDialog={showRenameDialog}
                setShowRenameDialog={setShowRenameDialog}
                showDeleteDialog={showDeleteDialog}
                setShowDeleteDialog={setShowDeleteDialog}
                onBoardRenameSuccess={handleBoardRenameSuccess}
                onAddColumnClick={() => setShowCreateColumnDialog(true)}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                showCreateColumnDialog={showCreateColumnDialog}
                setShowCreateColumnDialog={setShowCreateColumnDialog}
                showEditColumnDialog={showEditColumnDialog}
                setShowEditColumnDialog={setShowEditColumnDialog}
                showDeleteColumnDialog={showDeleteColumnDialog}
                setShowDeleteColumnDialog={setShowDeleteColumnDialog}
                selectedColumn={selectedColumn}
                onColumnSuccess={handleColumnSuccess}
            />
        </SidebarProvider>
    );
}

// Inner component that uses SidebarProvider context
function BoardViewContent({
    boardId,
    board,
    handleAddTask,
    activeTab,
    setActiveTab,
    navigate,
    sortBy,
    setSortBy,
    sortedColumns,
    tasksByColumn,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleTaskClick,
    activeTask,
    showCreateTaskDialog,
    setShowCreateTaskDialog,
    selectedColumnId,
    refreshTasks,
    processingTaskIds,
    setProcessingTaskIds,
    taskProgress,
    showTaskDialog,
    setShowTaskDialog,
    selectedTask,
    deleteTask,
    filteredAndSortedTasks,
    showSearchDialog,
    setShowSearchDialog,
    tasks,
    selectedContexts,
    onContextToggle,
    onClearContextFilters,
    showShareDialog,
    setShowShareDialog,
    selectedProjectId,
    onProjectChange,
    showRenameDialog,
    setShowRenameDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    onBoardRenameSuccess,
    onAddColumnClick,
    onEditColumn,
    onDeleteColumn,
    showCreateColumnDialog,
    setShowCreateColumnDialog,
    showEditColumnDialog,
    setShowEditColumnDialog,
    showDeleteColumnDialog,
    setShowDeleteColumnDialog,
    selectedColumn,
    onColumnSuccess,
}: {
    boardId: string | undefined;
    board: Board | null;
    handleAddTask: (columnId: string) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    navigate: ReturnType<typeof useNavigate>;
    sortBy: 'newest' | 'oldest' | 'title';
    setSortBy: (sort: 'newest' | 'oldest' | 'title') => void;
    sortedColumns: Column[];
    tasksByColumn: Map<string, Task[]>;
    sensors: ReturnType<typeof useSensors>;
    handleDragStart: (event: DragStartEvent) => void;
    handleDragEnd: (event: DragEndEvent) => Promise<void>;
    handleDragOver: (event: DragOverEvent) => void;
    handleTaskClick: (task: Task) => void;
    activeTask: Task | null;
    showCreateTaskDialog: boolean;
    setShowCreateTaskDialog: (open: boolean) => void;
    selectedColumnId: string | null;
    refreshTasks: () => void;
    processingTaskIds: Set<string>;
    setProcessingTaskIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    taskProgress: Map<string, AgentProgress>;
    showTaskDialog: boolean;
    setShowTaskDialog: (open: boolean) => void;
    selectedTask: Task | null;
    deleteTask: (taskId: string) => Promise<void>;
    filteredAndSortedTasks: Task[];
    showSearchDialog: boolean;
    setShowSearchDialog: (open: boolean) => void;
    tasks: Task[];
    selectedContexts: Set<TaskContext>;
    onContextToggle: (context: TaskContext) => void;
    onClearContextFilters: () => void;
    showShareDialog: boolean;
    setShowShareDialog: (open: boolean) => void;
    selectedProjectId: string | null;
    onProjectChange: (projectId: string | null) => void;
    showRenameDialog: boolean;
    setShowRenameDialog: (open: boolean) => void;
    showDeleteDialog: boolean;
    setShowDeleteDialog: (open: boolean) => void;
    onBoardRenameSuccess: () => void;
    onAddColumnClick?: () => void;
    onEditColumn?: (column: Column) => void;
    onDeleteColumn?: (column: Column) => void;
    showCreateColumnDialog: boolean;
    setShowCreateColumnDialog: (open: boolean) => void;
    showEditColumnDialog: boolean;
    setShowEditColumnDialog: (open: boolean) => void;
    showDeleteColumnDialog: boolean;
    setShowDeleteColumnDialog: (open: boolean) => void;
    selectedColumn: Column | null;
    onColumnSuccess: (column?: Column, operation?: 'create' | 'update' | 'delete') => void;
}) {
    const { open } = useSidebar();
    // Use the passed onAddColumnClick or create a default one
    const handleAddColumnClick = onAddColumnClick || (() => setShowCreateColumnDialog(true));
    const location = useLocation();

    return (
        <div className="flex h-screen w-full overflow-hidden">
            {open && <AppSidebar boardId={boardId} />}
            <div className="flex flex-1 flex-col overflow-hidden">
                <SiteHeader
                    board={board}
                    onAddTask={handleAddTask}
                    onSearchClick={() => setShowSearchDialog(true)}
                    onShareClick={() => setShowShareDialog(true)}
                    onRefresh={refreshTasks}
                    onRenameClick={() => setShowRenameDialog(true)}
                    onDeleteClick={() => setShowDeleteDialog(true)}
                    onAddColumnClick={() => setShowCreateColumnDialog(true)}
                />
                <div className="flex flex-1 flex-col overflow-auto">
                    {/* Context Filter Bar */}
                    <ContextFilterBar
                        selectedContexts={selectedContexts}
                        onContextToggle={onContextToggle}
                        onClearFilters={onClearContextFilters}
                    />

                    {/* Tabs Section */}
                    <div className="border-b bg-slate-50/50">
                        <div className="flex items-center justify-between px-4 lg:px-6">
                            <div className="flex items-center gap-2">
                                {[
                                    'By Status',
                                    'By Total Tasks',
                                    'Tasks Due',
                                    'Extra Tasks',
                                    'Tasks Completed',
                                    'Stale Tasks',
                                    'Someday',
                                    'Waiting',
                                    'Projects',
                                    'Analytics',
                                ].map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => {
                                            setActiveTab(tab);
                                            // Update URL when switching filter tabs
                                            const basePath = location.pathname.replace(
                                                /\/\/(stale|someday|waiting|projects|analytics)$/,
                                                '',
                                            );
                                            const filterRoutes: Record<string, string> = {
                                                'Stale Tasks': '/stale',
                                                Someday: '/someday',
                                                Waiting: '/waiting',
                                                Projects: '/projects',
                                                Analytics: '/analytics',
                                            };

                                            if (filterRoutes[tab]) {
                                                // Navigate to filter route
                                                if (
                                                    !location.pathname.endsWith(filterRoutes[tab])
                                                ) {
                                                    navigate(`${basePath}${filterRoutes[tab]}`, {
                                                        replace: true,
                                                    });
                                                }
                                            } else {
                                                // Navigate to base board route (remove any filter suffix)
                                                if (
                                                    location.pathname.match(
                                                        /\/(stale|someday|waiting|projects|analytics)$/,
                                                    )
                                                ) {
                                                    navigate(basePath, { replace: true });
                                                }
                                            }
                                        }}
                                        className={cn(
                                            'border-b-2 min-h-12 px-4 py-3 relative shrink-0 transition-colors',
                                            activeTab === tab
                                                ? 'border-indigo-600 text-slate-800'
                                                : 'border-transparent text-slate-600 hover:text-slate-800',
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm whitespace-nowrap">
                                                {tab}
                                            </span>
                                            {(tab === 'By Total Tasks' ||
                                                tab === 'Stale Tasks' ||
                                                tab === 'Someday' ||
                                                tab === 'Waiting' ||
                                                tab === 'Projects') && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {filteredAndSortedTasks.length}
                                                    </Badge>
                                                )}
                                            {tab === 'Analytics' && (
                                                <Badge variant="secondary" className="text-xs">
                                                    📊
                                                </Badge>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-4">
                                {board?.projects && board.projects.length > 0 && (
                                    <ProjectFilter
                                        projects={board.projects}
                                        selectedProjectId={selectedProjectId}
                                        onProjectChange={onProjectChange}
                                    />
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-600">
                                        Sort By
                                    </span>
                                    <Select
                                        value={sortBy}
                                        onValueChange={(value) =>
                                            setSortBy(value as 'newest' | 'oldest' | 'title')
                                        }
                                    >
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="newest">Newest</SelectItem>
                                            <SelectItem value="oldest">Oldest</SelectItem>
                                            <SelectItem value="title">Title</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area - Kanban Board, Projects, or Analytics */}
                    {activeTab === 'Analytics' ? (
                        <div className="flex flex-1 flex-col overflow-auto">
                            {boardId && <BoardAnalytics boardId={boardId} />}
                        </div>
                    ) : activeTab === 'Projects' ? (
                        <div className="flex flex-1 flex-col overflow-auto">
                            {board && (
                                <ProjectsManagement
                                    board={board}
                                    onProjectChange={() => {
                                        refreshBoard();
                                        refreshTasks();
                                    }}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                            {sortedColumns.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <p className="text-slate-400 text-lg">No columns found</p>
                                    <p className="text-slate-500 text-sm">
                                        Create your first column to get started
                                    </p>
                                    <Button onClick={handleAddColumnClick} className="mt-2">
                                        <Plus className="size-4 mr-2" />
                                        Create Column
                                    </Button>
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCorners}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={handleDragOver}
                                >
                                    <div className="flex gap-4 items-start relative shrink-0 w-full overflow-x-auto">
                                        {sortedColumns.map((column) => {
                                            const columnTasks = tasksByColumn.get(column.id) || [];
                                            return (
                                                <KanbanColumn
                                                    key={column.id}
                                                    column={column}
                                                    tasks={columnTasks}
                                                    onAddTask={handleAddTask}
                                                    onTaskClick={handleTaskClick}
                                                    onEditColumn={onEditColumn}
                                                    onDeleteColumn={onDeleteColumn}
                                                    processingTaskIds={processingTaskIds}
                                                    taskProgress={taskProgress}
                                                />
                                            );
                                        })}
                                    </div>
                                    <DragOverlay>
                                        {activeTask && <DraggableTaskCard task={activeTask} isProcessing={false} />}
                                    </DragOverlay>
                                </DndContext>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dialogs */}
            {board && selectedColumnId && (
                <CreateTaskDialog
                    open={showCreateTaskDialog}
                    onOpenChange={setShowCreateTaskDialog}
                    board={board}
                    columnId={selectedColumnId}
                    onSuccess={(taskId) => {
                        // Mark task as processing (waiting for hints)
                        if (taskId) {
                            setProcessingTaskIds((prev) => {
                                const next = new Set(prev);
                                next.add(taskId);
                                return next;
                            });
                        }
                        refreshTasks();
                    }}
                />
            )}

            {board && (
                <TaskDetailDialog
                    open={showTaskDialog}
                    onOpenChange={setShowTaskDialog}
                    task={selectedTask}
                    board={board}
                    onUpdate={refreshTasks}
                    onDelete={deleteTask}
                />
            )}

            <SearchDialog
                open={showSearchDialog}
                onOpenChange={setShowSearchDialog}
                tasks={tasks}
                onTaskClick={handleTaskClick}
            />

            {boardId && (
                <ShareDialog
                    open={showShareDialog}
                    onOpenChange={setShowShareDialog}
                    boardId={boardId}
                    boardName={board?.name}
                />
            )}

            <RenameBoardDialog
                open={showRenameDialog}
                onOpenChange={setShowRenameDialog}
                board={board}
                onSuccess={onBoardRenameSuccess}
            />

            <DeleteBoardDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                board={board}
                onSuccess={() => {
                    // Navigation is handled in the dialog
                }}
            />

            <CreateColumnDialog
                open={showCreateColumnDialog}
                onOpenChange={setShowCreateColumnDialog}
                board={board}
                onSuccess={(column) => onColumnSuccess(column, 'create')}
            />

            <EditColumnDialog
                open={showEditColumnDialog}
                onOpenChange={setShowEditColumnDialog}
                column={selectedColumn}
                onSuccess={(column) => onColumnSuccess(column, 'update')}
            />

            <DeleteColumnDialog
                open={showDeleteColumnDialog}
                onOpenChange={setShowDeleteColumnDialog}
                column={selectedColumn}
                onSuccess={(column) => onColumnSuccess(column, 'delete')}
            />
        </div>
    );
}
