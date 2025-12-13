import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBoards } from '@/hooks/useBoards';
import { useUsers } from '@/hooks/useUsers';
import { sendCapture } from '@/services/capture';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

function CaptureContentView() {
    const { users, ownerId, setOwnerId, loading: usersLoading } = useUsers();
    const { boards, loading: boardsLoading } = useBoards(ownerId);
    const [selectedBoardId, setSelectedBoardId] = useState<string>('');
    const [taskText, setTaskText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUserChange = (userId: string) => {
        setOwnerId(userId);
        setSelectedBoardId(''); // Reset board selection when user changes
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedBoardId) {
            toast.error('Please select a board');
            return;
        }

        if (!taskText.trim()) {
            toast.error('Please enter a task description');
            return;
        }

        if (!ownerId) {
            toast.error('User not found. Please refresh the page.');
            return;
        }

        setIsSubmitting(true);
        try {
            await sendCapture({
                ownerId,
                boardId: selectedBoardId,
                text: taskText.trim(),
                source: 'web-capture-view',
            });

            toast.success('Task captured successfully!');
            setTaskText('');
            setSelectedBoardId('');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to capture task');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4">
            <Card className="rounded-[40px] border-slate-200">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-[30px] font-extrabold leading-[38px] tracking-[-0.54px] text-slate-800">
                        Capture Task
                    </CardTitle>
                    <CardDescription className="text-[20px] leading-[1.6] text-slate-600">
                        Write a description of your task and select the board where it should be
                        added.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label
                                htmlFor="user"
                                className="text-base font-semibold text-slate-800"
                            >
                                User
                            </Label>
                            <Select
                                value={ownerId || ''}
                                onValueChange={handleUserChange}
                                disabled={usersLoading || isSubmitting}
                            >
                                <SelectTrigger
                                    id="user"
                                    className="h-12 rounded-[12px] border-slate-200 bg-white text-base"
                                >
                                    <SelectValue
                                        placeholder={
                                            usersLoading ? 'Loading users...' : 'Select a user'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name || user.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="board"
                                className="text-base font-semibold text-slate-800"
                            >
                                Board
                            </Label>
                            <Select
                                value={selectedBoardId}
                                onValueChange={setSelectedBoardId}
                                disabled={!ownerId || boardsLoading || isSubmitting}
                            >
                                <SelectTrigger
                                    id="board"
                                    className="h-12 rounded-[12px] border-slate-200 bg-white text-base"
                                >
                                    <SelectValue
                                        placeholder={
                                            !ownerId
                                                ? 'Select a user first'
                                                : boardsLoading
                                                  ? 'Loading boards...'
                                                  : 'Select a board'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {boards.map((board) => (
                                        <SelectItem key={board.id} value={board.id}>
                                            {board.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="task-description"
                                className="text-base font-semibold text-slate-800"
                            >
                                Task Description
                            </Label>
                            <Textarea
                                id="task-description"
                                placeholder="Describe your task here..."
                                value={taskText}
                                onChange={(e) => setTaskText(e.target.value)}
                                disabled={isSubmitting}
                                className="min-h-[200px] rounded-[12px] border-slate-200 bg-white text-base resize-none"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={
                                !ownerId ||
                                !selectedBoardId ||
                                !taskText.trim() ||
                                isSubmitting ||
                                boardsLoading ||
                                usersLoading
                            }
                            className="h-12 w-full rounded-[1234px] bg-indigo-600 text-base font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Capturing...
                                </>
                            ) : (
                                'Capture Task'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default CaptureContentView;
