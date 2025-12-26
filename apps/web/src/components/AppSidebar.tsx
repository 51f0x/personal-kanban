import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useBoards } from '@/hooks/useBoards';
import { useTasks } from '@/hooks/useTasks';
import { createBoardWithDefaultColumns } from '@/services/boards';
import { cn } from '@/utils/utils';
import {
    Archive,
    BarChart3,
    Calendar,
    ChevronDown,
    Clock,
    Folder,
    HelpCircle,
    Home,
    ListTodo,
    LogOut,
    Plus,
    Settings,
    Sparkles,
    User,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AppSidebarProps {
    boardId?: string;
}

export function AppSidebar({ boardId }: AppSidebarProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { isMobile } = useSidebar();
    const [showPromoCard, setShowPromoCard] = useState(true);
    const [isCreatingBoard, setIsCreatingBoard] = useState(false);

    // Get real task count for current board
    const { tasks } = useTasks(boardId || null);
    const taskCount = tasks?.length || 0;

    // Get boards list for switching
    const { boards, loading: boardsLoading, refresh: refreshBoards } = useBoards(user?.id);

    // Listen for board updates to refresh the boards list
    useEffect(() => {
        const handleBoardUpdate = () => {
            if (user?.id) {
                refreshBoards();
            }
        };

        // Listen to custom event for board updates
        window.addEventListener('board:updated', handleBoardUpdate);
        // Also listen to realtime board:update events
        window.addEventListener('board:realtime-update', handleBoardUpdate);

        return () => {
            window.removeEventListener('board:updated', handleBoardUpdate);
            window.removeEventListener('board:realtime-update', handleBoardUpdate);
        };
    }, [user?.id, refreshBoards]);

    // Load promotional card dismissal state from localStorage
    useEffect(() => {
        const dismissed = localStorage.getItem('sidebar_promo_dismissed');
        if (dismissed === 'true') {
            setShowPromoCard(false);
        }
    }, []);

    // Handle promotional card dismissal
    const handleDismissPromo = useCallback(() => {
        setShowPromoCard(false);
        localStorage.setItem('sidebar_promo_dismissed', 'true');
    }, []);

    // Handle board creation
    const handleCreateBoard = useCallback(async () => {
        if (!user?.id) {
            toast.error('Please log in to create a board');
            return;
        }

        setIsCreatingBoard(true);
        try {
            const newBoard = await createBoardWithDefaultColumns(user.id, user.name || 'User');
            toast.success('Board created successfully');
            await refreshBoards();
            navigate(`/board/${newBoard.id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create board');
        } finally {
            setIsCreatingBoard(false);
        }
    }, [user, refreshBoards, navigate]);

    // Generate initials from user name or email
    const getInitials = (): string => {
        if (user?.name) {
            const parts = user.name.trim().split(/\s+/);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return parts[0].substring(0, 2).toUpperCase();
        }
        if (user?.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return 'U';
    };

    // Check if a route is active
    const isActive = (path: string): boolean => {
        if (path === '/settings') {
            return location.pathname === '/settings';
        }
        if (path === '/capture') {
            return location.pathname === '/capture';
        }
        if (path.startsWith('/board/') && boardId) {
            return location.pathname === `/board/${boardId}`;
        }
        // Check for GTD views and board sub-routes
        if (path === '/someday') {
            return boardId
                ? location.pathname === `/board/${boardId}/someday` ||
                  location.pathname === `/boards/${boardId}/someday`
                : location.pathname === '/someday';
        }
        if (path === '/waiting') {
            return boardId
                ? location.pathname === `/board/${boardId}/waiting` ||
                  location.pathname === `/boards/${boardId}/waiting`
                : location.pathname === '/waiting';
        }
        if (path === '/stale') {
            return boardId
                ? location.pathname === `/board/${boardId}/stale` ||
                  location.pathname === `/boards/${boardId}/stale`
                : location.pathname === '/stale';
        }
        if (path === '/clarify') {
            return boardId
                ? location.pathname === `/board/${boardId}/clarify` ||
                  location.pathname === `/boards/${boardId}/clarify`
                : location.pathname === '/clarify';
        }
        if (path === '/projects') {
            return boardId
                ? location.pathname === `/board/${boardId}/projects` ||
                  location.pathname === `/boards/${boardId}/projects`
                : location.pathname === '/projects';
        }
        if (path === '/analytics') {
            return boardId
                ? location.pathname === `/board/${boardId}/analytics` ||
                  location.pathname === `/boards/${boardId}/analytics`
                : location.pathname === '/analytics';
        }
        return false;
    };

    // Get navigation item classes based on active state
    const getNavItemClasses = (path: string, isLink = true): string => {
        const active = isActive(path);
        const baseClasses =
            'box-border flex gap-2 items-center min-h-12 overflow-clip px-3 py-2.5 relative rounded-full shrink-0 w-full';
        const activeBg = active ? 'bg-indigo-700' : 'bg-indigo-600';
        const hoverClass = isLink ? 'hover:bg-indigo-700 transition-colors' : '';
        return cn(baseClasses, activeBg, hoverClass);
    };

    return (
        <aside className="bg-indigo-600 flex flex-col h-screen items-start justify-between px-4 py-8 shrink-0 w-[280px] border-r border-indigo-500">
            <div className="flex flex-col gap-8 items-start relative shrink-0 w-full">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-[0.5px] border-slate-200 bg-white">
                        <span className="text-lg font-bold text-indigo-600">S</span>
                    </div>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-white">
                        Personal Kanban
                    </span>
                </div>

                {/* Board Switcher */}
                {user?.id && (
                    <div className="w-full">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-between bg-indigo-500 hover:bg-indigo-400 text-white border-0"
                                >
                                    <span className="flex items-center gap-2">
                                        <Folder className="size-4" />
                                        <span className="font-medium">
                                            {boardId && boards.length > 0
                                                ? boards.find((b) => b.id === boardId)?.name ||
                                                  'Select Board'
                                                : 'Select Board'}
                                        </span>
                                    </span>
                                    <ChevronDown className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[240px]">
                                <DropdownMenuLabel>Boards</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {boardsLoading ? (
                                    <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                                ) : boards.length === 0 ? (
                                    <DropdownMenuItem disabled>No boards found</DropdownMenuItem>
                                ) : (
                                    boards.map((board) => (
                                        <DropdownMenuItem
                                            key={board.id}
                                            onClick={() => navigate(`/board/${board.id}`)}
                                            className={cn(
                                                'cursor-pointer',
                                                boardId === board.id && 'bg-accent',
                                            )}
                                        >
                                            <Folder className="size-4 mr-2" />
                                            {board.name}
                                        </DropdownMenuItem>
                                    ))
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleCreateBoard}
                                    disabled={isCreatingBoard}
                                    className="cursor-pointer"
                                >
                                    <Plus className="size-4 mr-2" />
                                    {isCreatingBoard ? 'Creating...' : 'Create New Board'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex flex-col gap-2 items-start relative shrink-0 w-full">
                    {/* Home */}
                    {boardId ? (
                        <Link
                            to={`/board/${boardId}`}
                            className={getNavItemClasses(`/board/${boardId}`)}
                        >
                            <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                                <Home className="relative shrink-0 size-6 text-white" />
                                <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                    Home
                                </p>
                            </div>
                            <div className="bg-white box-border flex gap-1.5 items-center justify-center overflow-clip px-2.5 py-1 relative rounded-[1234px] shrink-0">
                                <p className="font-semibold leading-5 relative shrink-0 text-sm text-center text-indigo-600 whitespace-pre">
                                    {taskCount}
                                </p>
                            </div>
                        </Link>
                    ) : (
                        <div className={getNavItemClasses('', false)}>
                            <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                                <Home className="relative shrink-0 size-6 text-white" />
                                <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                    Home
                                </p>
                            </div>
                            <div className="bg-white box-border flex gap-1.5 items-center justify-center overflow-clip px-2.5 py-1 relative rounded-[1234px] shrink-0">
                                <p className="font-semibold leading-5 relative shrink-0 text-sm text-center text-indigo-600 whitespace-pre">
                                    {taskCount}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tasks - Link to capture or board tasks */}
                    <Link
                        to={boardId ? `/board/${boardId}` : '/capture'}
                        className={getNavItemClasses(boardId ? `/board/${boardId}` : '/capture')}
                    >
                        <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                            <ListTodo
                                className={cn(
                                    'relative shrink-0 size-6',
                                    isActive(boardId ? `/board/${boardId}` : '/capture')
                                        ? 'text-white'
                                        : 'text-indigo-200',
                                )}
                            />
                            <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                Tasks
                            </p>
                        </div>
                    </Link>

                    {/* GTD Views */}
                    {boardId && (
                        <>
                            {/* Someday/Maybe */}
                            <Link
                                to={`/board/${boardId}/someday`}
                                className={getNavItemClasses('/someday')}
                            >
                                <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                                    <Sparkles
                                        className={cn(
                                            'relative shrink-0 size-6',
                                            isActive('/someday') ? 'text-white' : 'text-indigo-200',
                                        )}
                                    />
                                    <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                        Someday
                                    </p>
                                </div>
                            </Link>

                            {/* Waiting For */}
                            <Link
                                to={`/board/${boardId}/waiting`}
                                className={getNavItemClasses('/waiting')}
                            >
                                <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                                    <Clock
                                        className={cn(
                                            'relative shrink-0 size-6',
                                            isActive('/waiting') ? 'text-white' : 'text-indigo-200',
                                        )}
                                    />
                                    <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                        Waiting
                                    </p>
                                </div>
                            </Link>

                            {/* Stale Tasks */}
                            <Link
                                to={`/board/${boardId}/stale`}
                                className={getNavItemClasses('/stale')}
                            >
                                <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                                    <Calendar
                                        className={cn(
                                            'relative shrink-0 size-6',
                                            isActive('/stale') ? 'text-white' : 'text-indigo-200',
                                        )}
                                    />
                                    <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                        Stale
                                    </p>
                                </div>
                            </Link>

                            {/* Projects */}
                            <Link
                                to={`/board/${boardId}/projects`}
                                className={getNavItemClasses('/projects')}
                            >
                                <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                                    <Folder
                                        className={cn(
                                            'relative shrink-0 size-6',
                                            isActive('/projects')
                                                ? 'text-white'
                                                : 'text-indigo-200',
                                        )}
                                    />
                                    <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                        Projects
                                    </p>
                                </div>
                            </Link>

                            {/* Analytics */}
                            <Link
                                to={`/board/${boardId}/analytics`}
                                className={getNavItemClasses('/analytics')}
                            >
                                <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                                    <BarChart3
                                        className={cn(
                                            'relative shrink-0 size-6',
                                            isActive('/analytics')
                                                ? 'text-white'
                                                : 'text-indigo-200',
                                        )}
                                    />
                                    <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                        Analytics
                                    </p>
                                </div>
                            </Link>
                        </>
                    )}

                    {/* Settings */}
                    <Link to="/settings" className={getNavItemClasses('/settings')}>
                        <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                            <Settings
                                className={cn(
                                    'relative shrink-0 size-6',
                                    isActive('/settings') ? 'text-white' : 'text-indigo-200',
                                )}
                            />
                            <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                Settings
                            </p>
                        </div>
                    </Link>

                    {/* Help & Support */}
                    <a
                        href="https://github.com/51f0x/personal-kanban"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={getNavItemClasses('')}
                    >
                        <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                            <HelpCircle className="relative shrink-0 size-6 text-indigo-200" />
                            <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                Help & Support
                            </p>
                        </div>
                    </a>
                </nav>
            </div>

            <div className="flex flex-col gap-6 items-start relative shrink-0 w-full">
                {/* Promotional Card */}
                {showPromoCard && (
                    <div className="bg-indigo-500 box-border flex flex-col gap-4 items-start overflow-clip p-4 relative rounded-3xl shrink-0 w-full">
                        <div className="flex gap-4 items-start relative shrink-0 w-full">
                            <div className="basis-0 flex gap-2.5 grow items-start min-h-px min-w-px relative shrink-0">
                                <div className="bg-indigo-400 flex gap-2.5 items-center justify-center relative rounded-full shrink-0 size-10">
                                    <HelpCircle className="relative shrink-0 size-4 text-white" />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDismissPromo}
                                className="relative shrink-0 size-4 text-white cursor-pointer hover:opacity-70 transition-opacity"
                                aria-label="Dismiss promotional card"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <p className="font-normal leading-[1.6] min-w-full relative shrink-0 text-sm text-indigo-100">
                            Enjoy unlimited access to our app with only a small price monthly.
                        </p>
                        <div className="flex gap-4 items-start relative shrink-0">
                            <button
                                type="button"
                                onClick={handleDismissPromo}
                                className="flex gap-2 items-center justify-center overflow-clip relative shrink-0 hover:opacity-70 transition-opacity"
                            >
                                <p className="font-bold leading-5 relative shrink-0 text-sm text-nowrap text-indigo-200 whitespace-pre">
                                    Dismiss
                                </p>
                            </button>
                            <a
                                href="https://github.com/51f0x/personal-kanban"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex gap-2 items-center justify-center overflow-clip relative shrink-0 hover:opacity-70 transition-opacity"
                            >
                                <p className="font-bold leading-5 relative shrink-0 text-sm text-nowrap text-white whitespace-pre">
                                    Learn More
                                </p>
                            </a>
                        </div>
                    </div>
                )}

                {/* User Profile */}
                <div className="border-t border-indigo-500 border-solid box-border flex gap-4 items-end pb-0 pt-6 px-0 relative shrink-0 w-full">
                    <div className="basis-0 flex gap-3 grow items-center min-h-px min-w-px relative shrink-0">
                        <Avatar className="relative rounded-full shrink-0 size-10">
                            <AvatarFallback className="bg-indigo-400 text-white">
                                {getInitials()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="basis-0 flex flex-col gap-0.5 grow h-[46px] items-start min-h-px min-w-px relative shrink-0">
                            <p className="font-bold leading-[22px] relative shrink-0 text-base text-white w-full truncate">
                                {user?.name || user?.email || 'Guest'}
                            </p>
                            <p className="font-medium leading-5 relative shrink-0 text-sm text-indigo-200 w-full truncate">
                                {user?.email || 'Not logged in'}
                            </p>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="bg-indigo-600 box-border flex gap-2.5 items-center justify-center overflow-clip p-4 relative rounded-full shrink-0 size-10 hover:bg-indigo-500 transition-colors"
                                aria-label="User menu"
                            >
                                <Plus className="relative shrink-0 size-6 text-white rotate-45" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col">
                                    <span>{user?.name || 'User'}</span>
                                    <span className="text-xs font-normal text-muted-foreground">
                                        {user?.email}
                                    </span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link to="/settings" className="cursor-pointer">
                                    <User className="size-4 mr-2" />
                                    Profile & Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={async () => {
                                    await logout();
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                                <LogOut className="size-4 mr-2" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </aside>
    );
}
