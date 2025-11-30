import { CaptureForm } from '../features/capture/CaptureForm';
import { OwnerSelector } from '../features/capture/OwnerSelector';
import { useBoards } from '../hooks/useBoards';
import { useUsers } from '../hooks/useUsers';
import { useBoardRealtime } from '../hooks/useBoardRealtime';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/base/buttons/button';

export function CaptureContent() {
    const navigate = useNavigate();
    const {
        users,
        ownerId,
        setOwnerId,
        loading: usersLoading,
        error: usersError,
        createUser,
    } = useUsers();
    const {
        boards,
        loading: boardsLoading,
        error: boardsError,
        refresh,
    } = useBoards(ownerId);
    useBoardRealtime(
        boards.map((board) => board.id),
        refresh,
    );

    const loading = usersLoading || boardsLoading;
    const error = usersError || boardsError;

    // Logomark component matching Figma design (64x64px with gradient background)
    const Logomark = () => (
        <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center"
            style={{
                background: 'linear-gradient(to bottom right, var(--brand-60), #7C3AED)',
                borderRadius: '24px',
                boxShadow: '0px 8px 16px 0px rgba(79, 70, 229, 0.1)',
            }}
        >
            <span className="text-white text-2xl font-bold">K</span>
        </div>
    );

    return (
        <main className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {/* Main container matching Figma design */}
            <div
                className="w-full max-w-[1280px] flex flex-col items-center gap-2.5 border rounded-[64px] relative overflow-hidden"
                style={{
                    padding: 'clamp(48px, 15vw, 128px) clamp(32px, 10vw, 128px)',
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--gray-20)',
                    borderWidth: '1px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
            >
                {/* Background pattern/image - using gradient as placeholder */}
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.08) 0%, transparent 70%)',
                    }}
                />

                {/* Inner content frame */}
                <div className="relative z-10 flex flex-col items-center w-full gap-12">
                    {/* Header with Logomark and Title */}
                    <div className="flex flex-col items-center w-full gap-8">
                        <Logomark />
                        
                        <div className="flex flex-col items-center w-full gap-4">
                            <h1
                                className="text-center font-extrabold"
                                style={{
                                    fontSize: 'clamp(32px, 4vw, 56px)',
                                    lineHeight: '1.1111111111111112em',
                                    letterSpacing: '-0.02em',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontWeight: 800,
                                    color: 'var(--gray-80)',
                                }}
                            >
                                Capture Content
                            </h1>
                            <p
                                className="text-center max-w-2xl"
                                style={{
                                    fontSize: 'clamp(14px, 1.5vw, 20px)',
                                    lineHeight: '1.6em',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontWeight: 400,
                                    color: 'var(--gray-60)',
                                }}
                            >
                                Send anything to your Input queue. Type, paste, or use voice to capture tasks quickly.
                            </p>
                        </div>
                    </div>

                    {/* Owner Selector */}
                    <div className="w-full max-w-md">
                        <OwnerSelector
                            users={users}
                            ownerId={ownerId}
                            setOwnerId={setOwnerId}
                            onRegister={async (payload) => {
                                await createUser(payload);
                                refresh();
                            }}
                            loading={usersLoading}
                        />
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="w-full max-w-md p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                            Error: {error}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="w-full max-w-md p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                            Loading boards…
                        </div>
                    )}

                    {/* Capture Form */}
                    {!loading && ownerId && boards.length > 0 && (
                        <div className="w-full max-w-2xl">
                            <CaptureForm 
                                boards={boards} 
                                ownerId={ownerId} 
                                onCaptured={() => {
                                    refresh();
                                }} 
                            />
                        </div>
                    )}

                    {/* No Boards State */}
                    {!loading && ownerId && boards.length === 0 && (
                        <div className="w-full max-w-md p-8 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <p style={{ color: 'var(--gray-60)', marginBottom: '1rem' }}>
                                No boards found. Create a board first.
                            </p>
                            <Button
                                size="md"
                                color="primary"
                                onClick={() => navigate('/')}
                            >
                                Go to Home
                            </Button>
                        </div>
                    )}

                    {/* No Owner State */}
                    {!loading && !ownerId && (
                        <div className="w-full max-w-md p-8 rounded-lg bg-gray-50 border border-gray-200 text-center">
                            <p style={{ color: 'var(--gray-60)', marginBottom: '1rem' }}>
                                Please select or create an owner to capture content.
                            </p>
                        </div>
                    )}

                    {/* Back to Home Button */}
                    <div className="w-full max-w-md pt-4">
                        <Button
                            size="md"
                            color="secondary"
                            onClick={() => navigate('/')}
                        >
                            ← Back to Home
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}

