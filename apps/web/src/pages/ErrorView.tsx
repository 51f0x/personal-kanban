import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ExternalLink, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Background image from Figma
const imgRectangle = 'http://localhost:3845/assets/711f387786e876040cdeff622aee60080f8ef7db.png';

interface ErrorViewProps {
    errorCode?: string | number;
    title?: string;
    description?: string;
    showGoBack?: boolean;
    showHome?: boolean;
}

export default function ErrorView({
    errorCode = '505',
    title = "We're Under Maintenance",
    description = 'Sorry for trouble. Please come back later.',
    showGoBack = true,
    showHome = true,
}: ErrorViewProps) {
    const navigate = useNavigate();

    const handleGoBack = () => {
        navigate(-1);
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="flex h-screen w-full bg-white">
            {/* Left Section - Content */}
            <div className="flex h-full w-[60%] items-center justify-center px-20 py-24">
                <div className="flex w-full max-w-[600px] flex-col gap-12">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-[0.5px] border-slate-200 bg-white">
                            <span className="text-lg font-bold text-indigo-600">S</span>
                        </div>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-slate-800">
                            Personal Kanban
                        </span>
                    </div>

                    {/* Error Content */}
                    <div className="flex w-full flex-col gap-6">
                        {/* Error Badge */}
                        {errorCode && (
                            <Badge
                                variant="outline"
                                className="w-fit bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-50"
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                                    <span className="font-semibold">Error Code: {errorCode}</span>
                                </div>
                            </Badge>
                        )}

                        {/* Title */}
                        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-[60px] font-extrabold leading-[68px] tracking-[-1.08px] text-slate-800">
                            {title}
                        </h1>

                        {/* Description */}
                        <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-normal leading-[1.6] text-slate-600">
                            {description}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            {showGoBack && (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handleGoBack}
                                    className="h-14 rounded-[1234px] border-slate-300 px-6 text-[18px] font-bold leading-[24px] tracking-[-0.144px]"
                                >
                                    <ArrowLeft className="mr-3 h-6 w-6" />
                                    Go Back
                                </Button>
                            )}
                            {showHome && (
                                <Button
                                    size="lg"
                                    onClick={handleGoHome}
                                    className="h-14 rounded-[1234px] bg-indigo-600 px-6 text-[18px] font-bold leading-[24px] tracking-[-0.144px] text-white hover:bg-indigo-700"
                                >
                                    Take Me Home
                                    <Home className="ml-3 h-6 w-6" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <Separator className="w-full" />

                    {/* Additional Links */}
                    <div className="flex w-full flex-col gap-6">
                        {/* Documentation Link */}
                        <div className="flex flex-col gap-1">
                            <Link
                                to="#"
                                className="flex items-center gap-2.5 text-[16px] font-bold leading-[22px] tracking-[-0.112px] text-indigo-600 hover:underline"
                            >
                                Documentation
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-normal leading-[1.6] text-slate-600 whitespace-pre-wrap">
                                Why not read our comprehensive documentation while wait?
                            </p>
                        </div>

                        {/* Customer Support Link */}
                        <div className="flex flex-col gap-1">
                            <Link
                                to="#"
                                className="flex items-center gap-2.5 text-[16px] font-bold leading-[22px] tracking-[-0.112px] text-indigo-600 hover:underline"
                            >
                                Customer Support
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-normal leading-[1.6] text-slate-600">
                                Or chat our customer support, just annoy the guy forever
                            </p>
                        </div>

                        {/* Read Blog Link */}
                        <div className="flex flex-col gap-1">
                            <Link
                                to="#"
                                className="flex items-center gap-2.5 text-[16px] font-bold leading-[22px] tracking-[-0.112px] text-indigo-600 hover:underline"
                            >
                                Read Blog
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-normal leading-[1.6] text-slate-600">
                                If you're a fan of words, why not read out blog?
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section - Image */}
            <div className="relative h-full w-[40%] shrink-0">
                <img
                    alt="Modern building architecture"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    src={imgRectangle}
                />
            </div>
        </div>
    );
}
