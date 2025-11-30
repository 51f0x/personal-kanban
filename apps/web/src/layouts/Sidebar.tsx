import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Home01,
    File05,
    Users01,
    Cube01,
    CreditCard01,
    Settings01,
    MessageCircle01,
    SearchLg,
    X,
    ChevronRight,
    AlertCircle,
    User01,
} from '@untitledui/icons';
import { Avatar } from '@/components/base/avatar/avatar';
import { Button } from '@/components/base/buttons/button';

interface SidebarProps {
    taskCount?: number;
    userCount?: number;
}

interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path?: string;
    badge?: number;
}

export function Sidebar({ taskCount = 0, userCount = 0 }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [showProBanner, setShowProBanner] = useState(true);

    const navItems: NavItem[] = [
        { id: 'home', label: 'Home', icon: Home01, path: '/' },
        { id: 'tasks', label: 'Tasks', icon: File05, badge: taskCount },
        { id: 'users', label: 'Users', icon: Users01, badge: userCount },
        { id: 'apis', label: 'APIs', icon: Cube01 },
        { id: 'subscription', label: 'Subscription', icon: CreditCard01 },
        { id: 'settings', label: 'Settings', icon: Settings01 },
        { id: 'help', label: 'Help & Support', icon: MessageCircle01 },
    ];

    const isActive = (path?: string) => {
        if (!path) return false;
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <aside className="w-64 h-screen bg-secondary-solid flex flex-col fixed left-0 top-0 z-50 border-r border-primary">
            {/* Logo */}
            <div className="p-6 pb-5">
                <div className="flex items-center gap-2.5">
                    <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-fg-white font-bold text-xl shadow-lg"
                        style={{
                            background: 'linear-gradient(to bottom right, var(--color-brand-600), var(--color-violet-600))',
                        }}
                    >
                        S
                    </div>
                    <span className="text-fg-white font-semibold text-lg tracking-tight">slothui</span>
                </div>
            </div>

            {/* Search */}
            <div className="px-4 mb-5">
                <div className="relative">
                    <SearchLg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-primary border border-primary rounded-lg text-fg-primary placeholder-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                    />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => item.path && navigate(item.path)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        active
                                            ? 'bg-brand-solid text-fg-white shadow-sm'
                                            : 'text-fg-secondary hover:bg-tertiary hover:text-fg-primary'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon 
                                            className={`w-5 h-5 ${active ? 'text-fg-white' : 'text-tertiary'}`}
                                            data-icon
                                        />
                                        <span>{item.label}</span>
                                    </div>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold min-w-[1.5rem] text-center ${
                                            active
                                                ? 'bg-white/20 text-fg-white'
                                                : 'bg-brand-solid text-fg-white'
                                        }`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Pro Banner */}
            {showProBanner && (
                <div className="mx-4 mb-4 p-4 bg-brand-primary border border-brand rounded-lg relative">
                    <button
                        onClick={() => setShowProBanner(false)}
                        className="absolute top-2 right-2 text-tertiary hover:text-fg-primary transition-colors p-1 rounded"
                        aria-label="Close banner"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-start gap-2.5 mb-3 pr-6">
                        <AlertCircle className="w-5 h-5 text-brand-secondary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-fg-secondary leading-relaxed">
                            Enjoy unlimited access to our app with only a small price monthly.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            color="secondary"
                            onClick={() => setShowProBanner(false)}
                            className="flex-1"
                        >
                            Dismiss
                        </Button>
                        <Button
                            size="sm"
                            color="primary"
                            className="flex-1"
                        >
                            Go Pro
                        </Button>
                    </div>
                </div>
            )}

            {/* User Profile */}
            <div className="p-4 border-t border-primary">
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-tertiary transition-colors group">
                    <Avatar
                        size="sm"
                        src={undefined}
                        alt="User"
                        placeholderIcon={User01}
                        initials="AU"
                    />
                    <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-fg-white truncate">Azunyan U. Wu</p>
                        <p className="text-xs text-tertiary truncate">Basic Member</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-tertiary group-hover:text-fg-secondary flex-shrink-0 transition-colors" />
                </button>
            </div>
        </aside>
    );
}

