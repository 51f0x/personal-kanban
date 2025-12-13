import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TaskContext } from '@/services/types';
import { cn } from '@/utils/utils';
import { BookOpen, Mail, Monitor, MoreHorizontal, Phone, Users, Video, X } from 'lucide-react';

interface ContextFilterBarProps {
    selectedContexts: Set<TaskContext>;
    onContextToggle: (context: TaskContext) => void;
    onClearFilters: () => void;
}

const contextConfig: Record<TaskContext, { label: string; icon: typeof Mail; color: string }> = {
    EMAIL: { label: 'Email', icon: Mail, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    MEETING: {
        label: 'Meeting',
        icon: Users,
        color: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    },
    PHONE: { label: 'Phone', icon: Phone, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    READ: {
        label: 'Read',
        icon: BookOpen,
        color: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    },
    WATCH: { label: 'Watch', icon: Video, color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    DESK: {
        label: 'Desk',
        icon: Monitor,
        color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
    },
    OTHER: {
        label: 'Other',
        icon: MoreHorizontal,
        color: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    },
};

const allContexts: TaskContext[] = ['EMAIL', 'MEETING', 'PHONE', 'READ', 'WATCH', 'DESK', 'OTHER'];

export function ContextFilterBar({
    selectedContexts,
    onContextToggle,
    onClearFilters,
}: ContextFilterBarProps) {
    const hasActiveFilters = selectedContexts.size > 0;

    return (
        <div className="flex items-center gap-2 px-4 lg:px-6 py-2 bg-slate-50 border-b">
            <span className="text-sm font-medium text-slate-600 mr-1">Context:</span>
            <div className="flex items-center gap-2 flex-wrap">
                {allContexts.map((context) => {
                    const config = contextConfig[context];
                    const Icon = config.icon;
                    const isSelected = selectedContexts.has(context);

                    return (
                        <Button
                            key={context}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onContextToggle(context)}
                            className={cn(
                                'h-8 gap-1.5',
                                isSelected && config.color,
                                !isSelected && 'bg-white hover:bg-slate-50',
                            )}
                        >
                            <Icon className="size-3.5" />
                            <span>{config.label}</span>
                        </Button>
                    );
                })}
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearFilters}
                        className="h-8 gap-1.5 text-slate-600 hover:text-slate-900"
                    >
                        <X className="size-3.5" />
                        <span>Clear</span>
                    </Button>
                )}
            </div>
            {hasActiveFilters && (
                <Badge variant="secondary" className="ml-auto">
                    {selectedContexts.size} active
                </Badge>
            )}
        </div>
    );
}
