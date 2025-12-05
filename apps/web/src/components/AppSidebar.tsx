import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    ListTodo,
    Users,
    Puzzle,
    CreditCard,
    Settings,
    HelpCircle,
    Search,
    X,
    Plus,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarGroup, SidebarGroupContent, SidebarInput } from '@/components/ui/sidebar';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/utils';

// SearchForm Component
function SearchForm({ ...props }: React.ComponentProps<"form">) {
    return (
        <form {...props}>
            <SidebarGroup className="py-0">
                <SidebarGroupContent className="relative">
                    <Label htmlFor="search" className="sr-only">
                        Search
                    </Label>
                    <SidebarInput
                        id="search"
                        placeholder="Search the docs..."
                        className="pl-8"
                    />
                    <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
                </SidebarGroupContent>
            </SidebarGroup>
        </form>
    );
}

interface AppSidebarProps {
    boardId?: string;
}

export function AppSidebar({ boardId }: AppSidebarProps) {
    const { user } = useAuth();
    const location = useLocation();

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
        if (path.startsWith('/board/') && boardId) {
            return location.pathname === `/board/${boardId}`;
        }
        return false;
    };

    // Get navigation item classes based on active state
    const getNavItemClasses = (path: string, isLink = true): string => {
        const active = isActive(path);
        const baseClasses = 'box-border flex gap-2 items-center min-h-12 overflow-clip px-3 py-2.5 relative rounded-full shrink-0 w-full';
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

                {/* Search */}
                <SearchForm />

                {/* Navigation */}
                <nav className="flex flex-col gap-2 items-start relative shrink-0 w-full">
                    {/* Home */}
                    {boardId ? (
                        <Link
                            to={`/board/${boardId}`}
                            className={getNavItemClasses(`/board/${boardId}`)}
                        >
                            <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                                <Home className={cn(
                                    "relative shrink-0 size-6",
                                    isActive(`/board/${boardId}`) ? "text-white" : "text-white"
                                )} />
                                <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                    Home
                                </p>
                            </div>
                            <div className="bg-white box-border flex gap-1.5 items-center justify-center overflow-clip px-2.5 py-1 relative rounded-[1234px] shrink-0">
                                <p className="font-semibold leading-5 relative shrink-0 text-sm text-center text-indigo-600 whitespace-pre">
                                    10
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
                                    10
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tasks */}
                    <div className={getNavItemClasses('', false)}>
                        <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                            <ListTodo className="relative shrink-0 size-6 text-indigo-200" />
                            <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                Tasks
                            </p>
                        </div>
                    </div>


                    {/* Settings */}
                    <Link
                        to="/settings"
                        className={getNavItemClasses('/settings')}
                    >
                        <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                            <Settings className={cn(
                                "relative shrink-0 size-6",
                                isActive('/settings') ? "text-white" : "text-indigo-200"
                            )} />
                            <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                Settings
                            </p>
                        </div>
                    </Link>

                    {/* Help & Support */}
                    <div className={getNavItemClasses('', false)}>
                        <div className="basis-0 flex gap-2 grow items-center min-h-px min-w-px relative shrink-0">
                            <HelpCircle className="relative shrink-0 size-6 text-indigo-200" />
                            <p className="basis-0 font-bold grow leading-[22px] min-h-px min-w-px relative shrink-0 text-base text-white">
                                Help & Support
                            </p>
                        </div>
                    </div>
                </nav>
            </div>

            <div className="flex flex-col gap-6 items-start relative shrink-0 w-full">
                {/* Promotional Card */}
                <div className="bg-indigo-500 box-border flex flex-col gap-4 items-start overflow-clip p-4 relative rounded-3xl shrink-0 w-full">
                    <div className="flex gap-4 items-start relative shrink-0 w-full">
                        <div className="basis-0 flex gap-2.5 grow items-start min-h-px min-w-px relative shrink-0">
                            <div className="bg-indigo-400 flex gap-2.5 items-center justify-center relative rounded-full shrink-0 size-10">
                                <HelpCircle className="relative shrink-0 size-4 text-white" />
                            </div>
                        </div>
                        <X className="relative shrink-0 size-4 text-white cursor-pointer" />
                    </div>
                    <p className="font-normal leading-[1.6] min-w-full relative shrink-0 text-sm text-indigo-100">
                        Enjoy unlimited access to our app with only a small price monthly.
                    </p>
                    <div className="flex gap-4 items-start relative shrink-0">
                        <button type="button" className="flex gap-2 items-center justify-center overflow-clip relative shrink-0">
                            <p className="font-bold leading-5 relative shrink-0 text-sm text-nowrap text-indigo-200 whitespace-pre">
                                Dismiss
                            </p>
                        </button>
                        <button type="button" className="flex gap-2 items-center justify-center overflow-clip relative shrink-0">
                            <p className="font-bold leading-5 relative shrink-0 text-sm text-nowrap text-white whitespace-pre">
                                Go Pro
                            </p>
                        </button>
                    </div>
                </div>

                {/* User Profile */}
                <div className="border-t border-indigo-500 border-solid box-border flex gap-4 items-end pb-0 pt-6 px-0 relative shrink-0 w-full">
                    <div className="basis-0 flex gap-3 grow items-center min-h-px min-w-px relative shrink-0">
                        <Avatar className="relative rounded-full shrink-0 size-10">
                            <AvatarFallback className="bg-indigo-400 text-white">
                                {getInitials()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="basis-0 flex flex-col gap-0.5 grow h-[46px] items-start min-h-px min-w-px relative shrink-0">
                            <p className="font-bold leading-[22px] relative shrink-0 text-base text-white w-full">
                                {user?.name || user?.email || 'Guest'}
                            </p>
                            <p className="font-medium leading-5 relative shrink-0 text-sm text-indigo-200 w-full">
                                Basic Member
                            </p>
                        </div>
                    </div>
                    <div className="bg-indigo-600 box-border flex gap-2.5 items-center justify-center overflow-clip p-4 relative rounded-full shrink-0 size-10">
                        <Plus className="relative shrink-0 size-6 text-white" />
                    </div>
                </div>
            </div>
        </aside>
    );
}

