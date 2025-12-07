import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { fetchBoards, createBoardWithDefaultColumns } from '@/services/boards';
import { toast } from 'sonner';

// Background image from Figma
const imgFrame = 'http://localhost:3845/assets/7d14a5c11676965b6bb3bc1c347f4d037d6486b2.png';

export default function LoginView() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const user = await login({ email, password });
            toast.success('Login successful!');

            // Check if user has any boards
            let boards = await fetchBoards(user.id);

            // If no boards exist, create one with default columns
            if (boards.length === 0) {
                toast.info('Creating your first board...');
                const newBoard = await createBoardWithDefaultColumns(user.id, user.name);
                boards = [newBoard];
            }

            // Redirect to the first board or the page user was trying to access
            const from = (location.state as { from?: Location })?.from;
            if (from) {
                // Preserve both pathname and search parameters (query string)
                const redirectPath = from.pathname + (from.search || '');
                navigate(redirectPath, { replace: true });
            } else if (boards.length > 0) {
                navigate(`/board/${boards[0].id}`, { replace: true });
            } else {
                navigate('/board/default', { replace: true });
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-white">
            {/* Left Column - Background with Logo and Tagline */}
            <div className="relative flex h-full w-[40%] items-center justify-center p-16">
                <img
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    src={imgFrame}
                />
                <div className="relative z-10 flex h-full w-full flex-col justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-[0.5px] border-slate-200 bg-white">
                            <span className="text-lg font-bold text-indigo-600">S</span>
                        </div>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-white">
                            Personal Kanban
                        </span>
                    </div>

                    {/* Tagline */}
                    <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[60px] font-extrabold leading-[68px] tracking-[-1.08px] text-white">
                        Unleash your inner sloth today. 🦥
                    </p>
                </div>
            </div>

            {/* Right Column - Login Form */}
            <div className="flex h-full w-[60%] items-center justify-center">
                <div className="flex w-[480px] flex-col gap-10">
                    {/* Header */}
                    <div className="flex w-full flex-col gap-2 items-start">
                        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] w-full text-[24px] font-extrabold leading-[32px] tracking-[-0.288px] text-slate-800">
                            Sign In To Your Account.
                        </h1>
                        <p className="font-['Plus_Jakarta_Sans',sans-serif] w-full text-[18px] font-normal leading-[1.6] text-slate-600">
                            Let's sign in to your account and get started.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
                        {/* Email Input */}
                        <div className="flex w-full flex-col gap-2">
                            <Label htmlFor="email" className="text-[14px] font-bold leading-[20px] tracking-[-0.084px] text-slate-800">
                                Email Address
                            </Label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <Mail className="h-5 w-5 text-slate-600" />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="elementary221b@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 rounded-[123px] border-slate-300 bg-white pl-11 pr-4 text-[16px] font-medium leading-[22px] tracking-[-0.112px] text-slate-600"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="flex w-full flex-col gap-2">
                            <Label htmlFor="password" className="text-[14px] font-bold leading-[20px] tracking-[-0.084px] text-slate-800">
                                Password
                            </Label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <Lock className="h-5 w-5 text-slate-600" />
                                </div>
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="*****************"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 rounded-[123px] border-slate-300 bg-white pl-11 pr-11 text-[16px] font-medium leading-[22px] tracking-[-0.112px] text-slate-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Sign In Button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="h-12 w-full rounded-[1234px] bg-indigo-600 px-5 py-3 text-[16px] font-bold leading-[22px] tracking-[-0.112px] text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>

                        {/* Account Links */}
                        <div className="flex w-full flex-col gap-2 items-center">
                            <div className="flex w-full items-center justify-center gap-1">
                                <p className="text-[14px] font-bold leading-[20px] tracking-[-0.084px] text-slate-800 whitespace-pre">
                                    Don't have an account?
                                </p>
                                <Link
                                    to="/signup"
                                    className="text-[14px] font-bold leading-[20px] tracking-[-0.084px] text-indigo-600 hover:underline whitespace-pre"
                                >
                                    Sign Up
                                </Link>
                            </div>
                            <Link
                                to="/forgot-password"
                                className="text-[14px] font-bold leading-[20px] tracking-[-0.084px] text-indigo-600 hover:underline whitespace-pre"
                            >
                                Forgot Password
                            </Link>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="flex w-full items-center gap-3">
                        <Separator className="flex-1" />
                        <p className="font-['Plus_Jakarta_Sans',sans-serif] shrink-0 text-[12px] font-extrabold leading-[16px] tracking-[1.2px] uppercase text-slate-400 whitespace-pre">
                            OR
                        </p>
                        <Separator className="flex-1" />
                    </div>

                    {/* Social Login Buttons */}
                    <div className="flex w-full items-center justify-center gap-4">
                        {/* Facebook */}
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 flex-1 rounded-[1234px] border-slate-300 bg-white p-3 hover:bg-slate-50"
                        >
                            <div className="h-6 w-6">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                                    <path
                                        d="M24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 17.9895 4.3882 22.954 10.125 23.8542V15.4688H7.07812V12H10.125V9.35625C10.125 6.34875 11.9166 4.6875 14.6576 4.6875C15.9701 4.6875 17.3438 4.92188 17.3438 4.92188V7.875H15.8306C14.34 7.875 13.875 8.80008 13.875 9.75V12H17.2031L16.6711 15.4688H13.875V23.8542C19.6118 22.954 24 17.9895 24 12Z"
                                        fill="#1877F2"
                                    />
                                </svg>
                            </div>
                        </Button>

                        {/* X (Twitter) */}
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 flex-1 rounded-[1234px] border-slate-300 bg-white p-3 hover:bg-slate-50"
                        >
                            <div className="h-6 w-6">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                                    <path
                                        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                                        fill="currentColor"
                                        className="text-black"
                                    />
                                </svg>
                            </div>
                        </Button>

                        {/* Google */}
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 flex-1 rounded-[1234px] border-slate-300 bg-white p-3 hover:bg-slate-50"
                        >
                            <div className="h-6 w-6">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            </div>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

