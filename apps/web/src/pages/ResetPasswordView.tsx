import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

// Background image from Figma
const imgFrame = 'http://localhost:3845/assets/a797c203cd118d7d89d4696e816d40a0307c4762.png';

export default function ResetPasswordView() {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement reset password logic
        console.log('Reset Password:', { email });
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
                        Unravel your design Gen Z right now. 😴
                    </p>
                </div>
            </div>

            {/* Right Column - Reset Password Form */}
            <div className="flex h-full w-[60%] items-center justify-center">
                <div className="flex w-[480px] flex-col gap-10">
                    {/* Header */}
                    <div className="flex w-full flex-col gap-2 items-start">
                        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] w-full text-[36px] font-extrabold leading-[44px] tracking-[-0.504px] text-slate-800">
                            Reset Your Password.
                        </h1>
                        <p className="font-['Plus_Jakarta_Sans',sans-serif] w-full text-[18px] font-normal leading-[1.6] text-slate-600">
                            Let's sign up quickly to get started.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
                        {/* Email Input */}
                        <div className="flex w-full flex-col gap-2">
                            <Label
                                htmlFor="email"
                                className="text-[14px] font-bold leading-[20px] tracking-[-0.084px] text-slate-800"
                            >
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

                        {/* Reset Password Button */}
                        <Button
                            type="submit"
                            className="h-12 w-full rounded-[1234px] bg-indigo-600 px-5 py-3 text-[16px] font-bold leading-[22px] tracking-[-0.112px] text-white hover:bg-indigo-700"
                        >
                            Reset Password
                            <Lock className="ml-2 h-4 w-4" />
                        </Button>

                        {/* Back to Login Link */}
                        <div className="flex w-full flex-col gap-2.5 items-center justify-center">
                            <Link
                                to="/login"
                                className="flex items-center gap-2.5 text-[16px] font-bold leading-[22px] tracking-[-0.112px] text-indigo-600 hover:underline"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to login screen
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
