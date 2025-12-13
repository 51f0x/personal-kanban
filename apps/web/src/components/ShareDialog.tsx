import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    boardId: string;
    boardName?: string;
}

export function ShareDialog({ open, onOpenChange, boardId, boardName }: ShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const boardUrl = `${window.location.origin}/boards/${boardId}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(boardUrl);
            setCopied(true);
            toast.success('Board link copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy link to clipboard');
        }
    };

    const handleOpenLink = () => {
        window.open(boardUrl, '_blank');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="size-5" />
                        Share Board
                    </DialogTitle>
                    <DialogDescription>
                        {boardName
                            ? `Share "${boardName}" with others`
                            : 'Share this board with others'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="board-url">Board URL</Label>
                        <div className="flex gap-2">
                            <Input
                                id="board-url"
                                value={boardUrl}
                                readOnly
                                className="flex-1 font-mono text-sm"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopyLink}
                                title="Copy to clipboard"
                            >
                                {copied ? (
                                    <Check className="size-4 text-green-600" />
                                ) : (
                                    <Copy className="size-4" />
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleOpenLink}
                                title="Open in new tab"
                            >
                                <ExternalLink className="size-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm text-slate-600">
                            Anyone with this link can view the board. For private sharing, consider
                            implementing authentication and access control.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
