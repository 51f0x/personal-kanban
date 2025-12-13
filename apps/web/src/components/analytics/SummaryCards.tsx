import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { BoardSummary, WipBreaches } from '@/services/analytics';
import { AlertTriangle, CheckCircle2, Clock, Inbox, TrendingUp } from 'lucide-react';

interface SummaryCardsProps {
    summary: BoardSummary;
    wipBreaches: WipBreaches | null;
}

export function SummaryCards({ summary, wipBreaches }: SummaryCardsProps) {
    const cards = [
        {
            title: 'Total Tasks',
            value: summary.totalTasks,
            icon: Inbox,
            color: 'text-slate-600',
            bgColor: 'bg-slate-50',
        },
        {
            title: 'Completed',
            value: summary.completedTasks,
            icon: CheckCircle2,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            subtitle: `${summary.completionRate}% completion rate`,
        },
        {
            title: 'In Progress',
            value: summary.inProgressTasks,
            icon: Clock,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
        },
        {
            title: 'Input Queue',
            value: summary.inputTasks,
            icon: Inbox,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
        },
        {
            title: 'Stale Tasks',
            value: summary.staleTasks,
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card key={card.title} className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-600 mb-1">
                                    {card.title}
                                </p>
                                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                                {card.subtitle && (
                                    <p className="text-xs text-slate-500 mt-1">{card.subtitle}</p>
                                )}
                            </div>
                            <div className={`${card.bgColor} p-2 rounded-lg`}>
                                <Icon className={`size-5 ${card.color}`} />
                            </div>
                        </div>
                    </Card>
                );
            })}
            {wipBreaches && wipBreaches.breachingColumns > 0 && (
                <Card className="p-4 border-amber-200 bg-amber-50">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800 mb-1">WIP Breaches</p>
                            <p className="text-2xl font-bold text-amber-900">
                                {wipBreaches.breachingColumns}
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                                {wipBreaches.breachingColumns} of {wipBreaches.totalColumns} columns
                            </p>
                        </div>
                        <div className="bg-amber-100 p-2 rounded-lg">
                            <AlertTriangle className="size-5 text-amber-600" />
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
