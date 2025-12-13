import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Task } from '@/services/types';
import { cn } from '@/utils/utils';
import { ArrowRight, Calendar, Folder, Search, Tag, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface SearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

export function SearchDialog({ open, onOpenChange, tasks, onTaskClick }: SearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter tasks based on search query
    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase().trim();
        return tasks.filter((task) => {
            const titleMatch = task.title.toLowerCase().includes(query);
            const descriptionMatch = task.description?.toLowerCase().includes(query);
            const projectMatch = task.project?.name.toLowerCase().includes(query);
            const contextMatch = task.context?.toLowerCase().includes(query);
            const tagMatch = task.tags?.some(({ tag }) => tag.name.toLowerCase().includes(query));
            const waitingForMatch = task.waitingFor?.toLowerCase().includes(query);

            return (
                titleMatch ||
                descriptionMatch ||
                projectMatch ||
                contextMatch ||
                tagMatch ||
                waitingForMatch
            );
        });
    }, [tasks, searchQuery]);

    // Reset search when dialog closes
    useEffect(() => {
        if (!open) {
            setSearchQuery('');
        }
    }, [open]);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            // Small delay to ensure dialog is rendered
            setTimeout(() => {
                const input = document.querySelector('[data-search-input]') as HTMLInputElement;
                input?.focus();
            }, 100);
        }
    }, [open]);

    const handleTaskClick = (task: Task) => {
        onTaskClick(task);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Search Tasks</DialogTitle>
                    <DialogDescription>
                        Search tasks by title, description, project, context, tags, or waiting for
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                            data-search-input
                            placeholder="Type to search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0">
                        {searchQuery.trim() ? (
                            filteredTasks.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-600 px-1">
                                        Found {filteredTasks.length} task
                                        {filteredTasks.length !== 1 ? 's' : ''}
                                    </p>
                                    {filteredTasks.map((task) => (
                                        <Card
                                            key={task.id}
                                            className="p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => handleTaskClick(task)}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-slate-900 truncate">
                                                        {task.title}
                                                    </h4>
                                                    {task.description && (
                                                        <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {task.project && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                <Folder className="size-3 mr-1" />
                                                                {task.project.name}
                                                            </Badge>
                                                        )}
                                                        {task.context && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {task.context}
                                                            </Badge>
                                                        )}
                                                        {task.tags && task.tags.length > 0 && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                <Tag className="size-3 mr-1" />
                                                                {task.tags[0].tag.name}
                                                                {task.tags.length > 1 &&
                                                                    ` +${task.tags.length - 1}`}
                                                            </Badge>
                                                        )}
                                                        {task.dueAt && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                <Calendar className="size-3 mr-1" />
                                                                {new Date(
                                                                    task.dueAt,
                                                                ).toLocaleDateString()}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <ArrowRight className="size-4 text-slate-400 shrink-0 mt-1" />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Search className="size-12 text-slate-300 mb-4" />
                                    <p className="text-slate-600 font-medium">No tasks found</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Try a different search term
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Search className="size-12 text-slate-300 mb-4" />
                                <p className="text-slate-600 font-medium">Start typing to search</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Search by title, description, project, context, tags, or waiting
                                    for
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
