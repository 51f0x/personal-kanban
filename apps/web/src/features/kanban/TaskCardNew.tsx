import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../services/types';
import { getTaskDisplayValue } from '../../utils/taskDisplay';
import { Avatar } from '@/components/base/avatar/avatar';
import { MessageCircle01, User01 } from '@untitledui/icons';

interface TaskCardNewProps {
    task: Task;
    isDragging?: boolean;
    onClick?: () => void;
}

// Priority label mapping using design system tokens
const getPriorityLabel = (task: Task): { label: string; bgColor: string; textColor: string } => {
    // Check if task has a priority tag
    const priorityTag = task.tags?.find(({ tag }) =>
        ['high priority', 'low priority', 'important', 'priority', 'meh', 'ok', 'not that important'].includes(tag.name.toLowerCase())
    );

    if (priorityTag) {
        const name = priorityTag.tag.name.toLowerCase();
        if (name.includes('important') && !name.includes('not')) {
            return { label: 'Important', bgColor: 'var(--color-brand-100)', textColor: 'var(--color-brand-800)' };
        }
        if (name.includes('meh')) {
            return { label: 'Meh', bgColor: 'var(--color-blue-100)', textColor: 'var(--color-blue-800)' };
        }
        if (name.includes('ok')) {
            return { label: 'OK', bgColor: 'var(--color-warning-100)', textColor: 'var(--color-warning-800)' };
        }
        if (name.includes('not that important') || (name.includes('not') && name.includes('important'))) {
            return { label: 'Not that important', bgColor: 'var(--color-error-100)', textColor: 'var(--color-error-800)' };
        }
    }

    // Default priority labels using design system tokens
    const priorities = [
        { label: 'Important', bgColor: 'var(--color-brand-100)', textColor: 'var(--color-brand-800)' },
        { label: 'Meh', bgColor: 'var(--color-blue-100)', textColor: 'var(--color-blue-800)' },
        { label: 'OK', bgColor: 'var(--color-warning-100)', textColor: 'var(--color-warning-800)' },
        { label: 'Not that important', bgColor: 'var(--color-error-100)', textColor: 'var(--color-error-800)' },
    ];

    // Use task ID hash to consistently assign priority for demo
    const hash = task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return priorities[hash % priorities.length];
};

// Mock data for comments and views - in real app these would come from task metadata
const getMockStats = (task: Task): { comments: number; views: number } => {
    // Use task ID to generate consistent mock data
    const hash = task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const comments = ((hash * 17) % 1000) + 1;
    const views = ((hash * 23) % 100000) + 1;
    return { comments, views };
};

// Mock assigned users - in real app these would come from task.assignees or similar
const getMockAssignees = (task: Task): Array<{ id: string; name: string; initials: string }> => {
    const hash = task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const count = (hash % 4) + 1;
    return Array.from({ length: count }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i + 1}`,
        initials: `U${i + 1}`,
    }));
};

function formatNumber(num: number): string {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
}

export function TaskCardNew({ task, isDragging, onClick }: TaskCardNewProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging || (e.target as HTMLElement).closest('button, a')) {
            return;
        }
        e.stopPropagation();
        onClick?.();
    };

    const display = getTaskDisplayValue(task);
    const priority = getPriorityLabel(task);
    const stats = getMockStats(task);
    const assignees = getMockAssignees(task);
    const maxVisibleAvatars = 4;
    const visibleAssignees = assignees.slice(0, maxVisibleAvatars);
    const remainingCount = assignees.length - maxVisibleAvatars;

    // Calculate progress from checklist
    const checklistProgress = task.checklist?.length
        ? {
            done: task.checklist.filter((c) => c.isDone).length,
            total: task.checklist.length,
            percentage: Math.round((task.checklist.filter((c) => c.isDone).length / task.checklist.length) * 100),
        }
        : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            className={`bg-primary border border-secondary rounded-lg p-4 cursor-grab transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-primary active:cursor-grabbing ${onClick ? 'cursor-pointer' : ''
                } ${isDragging ? 'opacity-50' : ''}`}
        >
            {/* Priority Label */}
            {priority.label && (
                <div className="mb-2.5">
                    <span
                        className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                            backgroundColor: priority.bgColor,
                            color: priority.textColor,
                        }}
                    >
                        {priority.label}
                    </span>
                </div>
            )}

            {/* Title */}
            <h4 className="font-bold text-base text-fg-primary mb-4 leading-tight">
                {display.title}
            </h4>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center gap-2.5">
                    <span className="text-xs text-fg-tertiary font-normal whitespace-nowrap">Progress</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: checklistProgress ? `${checklistProgress.percentage}%` : '0%',
                                backgroundColor: 'var(--color-brand-600)',
                            }}
                        />
                    </div>
                    <span className="text-xs text-fg-secondary font-medium whitespace-nowrap">
                        {checklistProgress ? `${checklistProgress.percentage}%` : '0%'}
                    </span>
                </div>
            </div>

            {/* Footer: Avatars, Comments, Checkmarks */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-tertiary">
                <div className="flex items-center">
                    {/* Assigned Users Avatars */}
                    {assignees.length > 0 && (
                        <div className="flex -space-x-2 relative">
                            {visibleAssignees.map((assignee, index) => (
                                <div
                                    key={assignee.id}
                                    className="border-2 border-primary rounded-full"
                                    style={{ zIndex: visibleAssignees.length - index }}
                                >
                                    <Avatar
                                        size="xs"
                                        initials={assignee.initials}
                                        alt={assignee.name}
                                        placeholderIcon={User01}
                                    />
                                </div>
                            ))}
                            {remainingCount > 0 && (
                                <div
                                    className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center text-xs font-medium text-fg-white relative"
                                    style={{ backgroundColor: 'var(--color-brand-600)', zIndex: 0 }}
                                >
                                    +{remainingCount}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 text-xs text-fg-tertiary">
                    {/* Comments */}
                    {stats.comments > 0 && (
                        <div className="flex items-center gap-1.5">
                            <MessageCircle01 className="w-4 h-4 text-fg-quaternary" />
                            <span className="font-medium text-fg-secondary">{formatNumber(stats.comments)}</span>
                        </div>
                    )}

                    {/* Checkmarks */}
                    {stats.views > 0 && (
                        <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-fg-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium text-fg-secondary">{formatNumber(stats.views)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

