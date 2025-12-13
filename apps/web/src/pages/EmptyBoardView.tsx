import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { createBoardWithDefaultColumns } from '@/services/boards';
import { FolderKanban, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function EmptyBoardView() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();

    const handleCreateBoard = async () => {
        if (!user?.id) {
            toast.error('Please log in to create a board');
            return;
        }

        try {
            const newBoard = await createBoardWithDefaultColumns(user.id, user.name || 'User');
            toast.success('Board created successfully');

            // Update user to set this as default board
            await refreshUser();

            navigate(`/board/${newBoard.id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create board');
        }
    };

    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex h-screen w-full overflow-hidden">
                <AppSidebar />
                <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-8">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                                <FolderKanban className="h-8 w-8 text-indigo-600" />
                            </div>
                            <CardTitle className="text-2xl">No Boards Yet</CardTitle>
                            <CardDescription className="text-base">
                                Create your first board to start organizing your tasks with GTD
                                principles.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                onClick={handleCreateBoard}
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                size="lg"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Create Your First Board
                            </Button>
                            <p className="text-center text-sm text-slate-500">
                                Your board will come with default GTD columns: Input, Next Actions,
                                In Progress, and Done.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </SidebarProvider>
    );
}
