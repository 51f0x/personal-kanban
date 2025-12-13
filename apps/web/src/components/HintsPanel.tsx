import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { applyHint, deleteHint, dismissHint, fetchHints } from '@/services/hints';
import type { Hint } from '@/services/types';
import { cn } from '@/utils/utils';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    Lightbulb,
    ListChecks,
    Sparkles,
    Tag as TagIcon,
    TrendingUp,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface HintsPanelProps {
    taskId: string;
    onHintApplied?: () => void;
}

export function HintsPanel({ taskId, onHintApplied }: HintsPanelProps) {
    const [hints, setHints] = useState<Hint[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState<string | null>(null);

    useEffect(() => {
        loadHints();
    }, [taskId]);

    const loadHints = async () => {
        try {
            setLoading(true);
            const data = await fetchHints(taskId);
            setHints(data);
        } catch (error) {
            console.error('Failed to load hints:', error);
            toast.error('Failed to load hints');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (hintId: string) => {
        try {
            setApplying(hintId);
            await applyHint(hintId, false);
            toast.success('Hint applied successfully');
            await loadHints();
            onHintApplied?.();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to apply hint');
        } finally {
            setApplying(null);
        }
    };

    const handleDismiss = async (hintId: string) => {
        try {
            setApplying(hintId);
            await dismissHint(hintId);
            toast.success('Hint dismissed');
            await loadHints();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to dismiss hint');
        } finally {
            setApplying(null);
        }
    };

    const handleDelete = async (hintId: string) => {
        try {
            setApplying(hintId);
            await deleteHint(hintId);
            toast.success('Hint deleted');
            await loadHints();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete hint');
        } finally {
            setApplying(null);
        }
    };

    const getHintIcon = (hintType: string) => {
        switch (hintType) {
            case 'title':
            case 'description':
                return <FileText className="size-4" />;
            case 'tags':
                return <TagIcon className="size-4" />;
            case 'actions':
                return <ListChecks className="size-4" />;
            case 'summary':
                return <Sparkles className="size-4" />;
            case 'priority':
                return <TrendingUp className="size-4" />;
            case 'duration':
                return <Clock className="size-4" />;
            case 'context':
                return <AlertCircle className="size-4" />;
            default:
                return <Lightbulb className="size-4" />;
        }
    };

    const renderHintContent = (hint: Hint) => {
        if (hint.data && typeof hint.data === 'object') {
            if ('tags' in hint.data && Array.isArray(hint.data.tags)) {
                return (
                    <div className="flex flex-wrap gap-2">
                        {(hint.data.tags as string[]).map((tag, idx) => (
                            <Badge key={idx} variant="secondary">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                );
            }
            if ('actions' in hint.data && Array.isArray(hint.data.actions)) {
                return (
                    <ul className="list-disc list-inside space-y-1">
                        {(hint.data.actions as Array<{ description: string }>).map(
                            (action, idx) => (
                                <li key={idx} className="text-sm">
                                    {action.description}
                                </li>
                            ),
                        )}
                    </ul>
                );
            }
            if ('projects' in hint.data && Array.isArray(hint.data.projects)) {
                return (
                    <div className="flex flex-wrap gap-2">
                        {(hint.data.projects as string[]).map((project, idx) => (
                            <Badge key={idx} variant="outline">
                                {project}
                            </Badge>
                        ))}
                    </div>
                );
            }
        }

        if (hint.content) {
            return <p className="text-sm text-muted-foreground">{hint.content}</p>;
        }

        return null;
    };

    const unappliedHints = hints.filter((h) => !h.applied);
    const appliedHints = hints.filter((h) => h.applied);

    if (loading) {
        return (
            <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Loading hints...</div>
            </div>
        );
    }

    if (hints.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Lightbulb className="size-5 text-amber-500" />
                <h3 className="text-lg font-semibold">AI Suggestions</h3>
            </div>

            {unappliedHints.length > 0 && (
                <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                        Available Suggestions ({unappliedHints.length})
                    </div>
                    {unappliedHints.map((hint) => (
                        <Card key={hint.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1">
                                    <div className="mt-0.5 text-muted-foreground">
                                        {getHintIcon(hint.hintType)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">
                                                {hint.title || hint.hintType}
                                            </span>
                                            {hint.confidence != null && (
                                                <Badge variant="outline" className="text-xs">
                                                    {Math.round(hint.confidence * 100)}% confidence
                                                </Badge>
                                            )}
                                        </div>
                                        {renderHintContent(hint)}
                                        <div className="text-xs text-muted-foreground">
                                            From{' '}
                                            {hint.agentId.replace('-agent', '').replace(/-/g, ' ')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t">
                                <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleApply(hint.id)}
                                    disabled={applying === hint.id}
                                >
                                    <CheckCircle2 className="size-3 mr-1" />
                                    Apply
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDismiss(hint.id)}
                                    disabled={applying === hint.id}
                                >
                                    Dismiss
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(hint.id)}
                                    disabled={applying === hint.id}
                                >
                                    <XCircle className="size-3" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {appliedHints.length > 0 && (
                <div className="space-y-3">
                    <Separator />
                    <div className="text-sm font-medium text-muted-foreground">
                        Applied Suggestions ({appliedHints.length})
                    </div>
                    {appliedHints.map((hint) => (
                        <Card key={hint.id} className="p-4 bg-muted/50 opacity-75">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="size-4 text-green-500 mt-0.5" />
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {hint.title || hint.hintType}
                                        </span>
                                        <Badge variant="secondary" className="text-xs">
                                            Applied
                                        </Badge>
                                    </div>
                                    {renderHintContent(hint)}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
