import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Background image from Figma
const imgFrame = 'http://localhost:3845/assets/0396ff77972abf934b8841feea0320c72fe7fbeb.png';

// Password strength calculation
function calculatePasswordStrength(password: string): { strength: number; label: string } {
    if (!password) return { strength: 0, label: 'Weak' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return { strength, label: labels[Math.min(strength, 3)] };
}

export default function SignUpView() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const passwordStrength = calculatePasswordStrength(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!username.trim()) {
            toast.error('Username is required');
            return;
        }

        if (!email.trim()) {
            toast.error('Email is required');
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        setIsLoading(true);

        try {
            const user = await signup({
                email: email.trim(),
                name: username.trim(),
                password,
            });

            toast.success('Account created successfully!');

            // Redirect to the first board or settings if no board
            // The backend creates a default board during registration
            // We'll need to fetch boards or redirect to a board selection page
            // For now, redirect to settings where user can see their boards
            navigate('/settings', { replace: true });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Sign up failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-white">
            {/* Left Column - Background with Logo and Tagline */}
            <div className="relative flex h-full w-[40%] items-center justify-center p-16">
                <img
                    alt="Background gradient"
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
                        Wecome to the era of laziness 4.0 🤖
                    </p>
                </div>
            </div>

            {/* Right Column - Sign Up Form */}
            <div className="flex h-full w-[60%] items-center justify-center">
                <div className="flex w-[480px] flex-col gap-10">
                    {/* Header */}
                    <div className="flex w-full flex-col gap-2 items-start">
                        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] w-full text-[24px] font-extrabold leading-[32px] tracking-[-0.288px] text-slate-800">
                            Sign Up For Free.
                        </h1>
                        <p className="font-['Plus_Jakarta_Sans',sans-serif] w-full text-[18px] font-normal leading-[1.6] text-slate-600">
                            Let's sign up quickly to get started.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
                        {/* Username Input */}
                        <div className="flex w-full flex-col gap-2">
                            <Label htmlFor="username" className="text-[14px] font-bold leading-[20px] tracking-[-0.084px] text-slate-800">
                                Username
                            </Label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <User className="h-5 w-5 text-slate-600" />
                                </div>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="X_AE_A_13b"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="h-12 rounded-[123px] border-slate-300 bg-white pl-11 pr-4 text-[16px] font-medium leading-[22px] tracking-[-0.112px] text-slate-600"
                                />
                            </div>
                        </div>

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

                            {/* Password Strength Indicator */}
                            {password && (
                                <>
                                    <div className="flex w-full gap-1">
                                        {[0, 1, 2, 3].map((index) => (
                                            <div
                                                key={index}
                                                className={`h-1 flex-1 rounded-[1234px] ${index < passwordStrength.strength
                                                    ? 'bg-green-500'
                                                    : 'bg-slate-300'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="font-['Plus_Jakarta_Sans',sans-serif] h-[18px] text-[14px] font-medium leading-[20px] tracking-[-0.084px] text-slate-600">
                                        Password strength: {passwordStrength.label}
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Sign Up Button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="h-12 w-full rounded-[1234px] bg-indigo-600 px-5 py-3 text-[16px] font-bold leading-[22px] tracking-[-0.112px] text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>

                        {/* Account Links */}
                        <div className="flex w-full items-center justify-center gap-1">
                            <p className="text-[14px] font-bold leading-[20px] tracking-[-0.084px] text-slate-800 whitespace-pre">
                                Already have an account?
                            </p>
                            <Link
                                to="/login"
                                className="text-[14px] font-bold leading-[20px] tracking-[-0.084px] text-indigo-600 hover:underline whitespace-pre"
                            >
                                Sign In.
                            </Link>
                        </div>
                    </form>

                    {/* Google Sign Up Button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-12 w-full rounded-[1234px] border-slate-300 bg-white px-4 py-2.5 hover:bg-slate-50"
                    >
                        <div className="h-6 w-6">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                                <title>Google logo</title>
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
                        <span className="ml-3 text-[16px] font-bold leading-[22px] tracking-[-0.112px] text-slate-800">
                            Sign Up With Google
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
}

