import { useState } from 'react';
import { SearchLg, Plus, ChevronDown } from '@untitledui/icons';
import { Tabs } from '@/components/application/tabs/tabs';
import { Button } from '@/components/base/buttons/button';

interface KanbanHeaderProps {
    boardName: string;
    totalTasks?: number;
    onSearch?: (query: string) => void;
    onAdd?: () => void;
    onShare?: () => void;
    onSortChange?: (sortBy: string) => void;
}

export function KanbanHeader({
    boardName,
    totalTasks = 0,
    onSearch,
    onAdd,
    onShare,
    onSortChange,
}: KanbanHeaderProps) {
    const [sortBy, setSortBy] = useState('newest');

    const handleSortChange = (value: string) => {
        setSortBy(value);
        onSortChange?.(value);
    };

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {boardName}
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onSearch?.('')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Search"
                    >
                        <SearchLg className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onShare}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Share"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                    <Button
                        size="sm"
                        color="primary"
                        onClick={onAdd}
                        className="gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </Button>
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => handleSortChange(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer transition-all"
                        >
                            <option value="newest">Sort By Newest</option>
                            <option value="oldest">Sort By Oldest</option>
                            <option value="priority">Sort By Priority</option>
                            <option value="name">Sort By Name</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs selectedKey="by-status" onSelectionChange={() => { }}>
                <Tabs.List
                    type="underline"
                    size="sm"
                    items={[
                        { id: 'by-status', label: 'By Status' },
                        { id: 'by-total', label: 'By Total Tasks', badge: totalTasks > 0 ? totalTasks : undefined },
                        { id: 'tasks-due', label: 'Tasks Due' },
                        { id: 'extra-tasks', label: 'Extra Tasks' },
                        { id: 'tasks-completed', label: 'Tasks Completed' },
                    ]}
                >
                    {(item) => (
                        <Tabs.Item id={item.id} badge={item.badge} label={item.label} />
                    )}
                </Tabs.List>
            </Tabs>
        </header>
    );
}

