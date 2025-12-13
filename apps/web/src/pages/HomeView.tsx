import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

// Images from Figma
const imgBg = 'http://localhost:3845/assets/201faa1ef50a78dda4233dc317a385f1f17ffd6c.png';
const imgDashboard = 'http://localhost:3845/assets/9984f261694828955e9aa9195e8d20d404adb494.png';
const imgAvatar = 'http://localhost:3845/assets/7c8eaeb85d1def44217c940aa20e833a1b84bc1a.png';

// Logo component
function Logo() {
    return (
        <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                <div className="h-[18px] w-[14px]">
                    <svg
                        viewBox="0 0 14 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-full w-full"
                    >
                        <title>Logo icon</title>
                        <path
                            d="M7 0L0 4.5V9C0 13.5 3.5 17.5 7 18C10.5 17.5 14 13.5 14 9V4.5L7 0Z"
                            fill="#4F46E5"
                        />
                    </svg>
                </div>
            </div>
            <div className="h-[17px] w-[69px]">
                <svg
                    viewBox="0 0 69 17"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-full w-full"
                >
                    <title>Logo text</title>
                    <path d="M0 0H69V17H0V0Z" fill="#1E293B" />
                </svg>
            </div>
        </div>
    );
}

// Header Navigation
function HeaderNavigation() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="w-full">
            <div className="mx-auto flex max-w-[1216px] items-center justify-between gap-4 px-4 py-4 md:px-28">
                <div className="flex items-center gap-12">
                    <Logo />
                    <nav className="hidden items-center gap-8 md:flex">
                        <Link
                            to="/"
                            className="text-sm font-bold text-slate-600 hover:text-slate-800"
                        >
                            Home
                        </Link>
                        <Link
                            to="/login"
                            className="text-sm font-bold text-slate-600 hover:text-slate-800"
                        >
                            Board
                        </Link>
                        <Link
                            to="/login"
                            className="text-sm font-bold text-slate-600 hover:text-slate-800"
                        >
                            Capture
                        </Link>
                        <Link
                            to="/login"
                            className="text-sm font-bold text-slate-600 hover:text-slate-800"
                        >
                            Analytics
                        </Link>
                        <Link
                            to="/login"
                            className="text-sm font-bold text-slate-600 hover:text-slate-800"
                        >
                            Settings
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="hidden md:flex" asChild>
                        <Link to="/login">Login</Link>
                    </Button>
                    <Button
                        className="hidden bg-indigo-600 text-white md:flex hover:bg-indigo-700"
                        asChild
                    >
                        <Link to="/signup">Get Started</Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>
            </div>
        </header>
    );
}

// Hero Section
function HeroSection() {
    return (
        <section className="relative w-full overflow-hidden bg-white">
            {/* Background */}
            <div className="absolute inset-0">
                <img
                    alt="Background gradient"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    src={imgBg}
                />
            </div>

            <div className="relative">
                <HeaderNavigation />

                <div className="mx-auto max-w-[1216px] px-4 py-32 md:px-28">
                    <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-8">
                        {/* Left Content */}
                        <div className="flex flex-1 flex-col gap-12">
                            <div className="flex flex-col gap-6">
                                <Badge className="w-fit bg-indigo-50 text-indigo-600">
                                    Self-Hosted GTD
                                </Badge>
                                <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-[60px] font-extrabold leading-[68px] tracking-[-1.08px] text-slate-800">
                                    Your Personal Kanban Board with GTD Principles.
                                </h1>
                                <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-normal leading-[1.6] text-slate-600">
                                    A fully self-hosted productivity system that unifies capture,
                                    clarification, automation, recurring tasks, and analytics. Own
                                    your data, control your workflow.
                                </p>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-col gap-4 sm:flex-row">
                                <Button
                                    asChild
                                    className="h-12 rounded-full bg-indigo-600 px-8 text-white hover:bg-indigo-700"
                                >
                                    <Link to="/login">Open Your Board</Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="h-12 rounded-full border-slate-300 px-8"
                                >
                                    <Link to="/login">Quick Capture</Link>
                                </Button>
                            </div>
                        </div>

                        {/* Right Image */}
                        <div className="flex-1">
                            <div className="relative">
                                <img
                                    alt="Dashboard preview"
                                    className="w-full rounded-[32px] border-8 border-white/32 object-cover"
                                    src={imgDashboard}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Key Benefits Section
function KeyBenefitsSection() {
    const benefits = [
        { name: 'Self-Hosted', icon: '🔒' },
        { name: 'GTD Aligned', icon: '✅' },
        { name: 'Automation', icon: '⚙️' },
        { name: 'Analytics', icon: '📊' },
        { name: 'Offline Ready', icon: '📱' },
        { name: 'Privacy First', icon: '🛡️' },
        { name: 'Open Source', icon: '💻' },
        { name: 'Your Data', icon: '🗄️' },
    ];

    return (
        <section className="bg-slate-50 py-16">
            <div className="mx-auto max-w-[1216px] px-4 md:px-28">
                <div className="flex flex-col gap-8">
                    <p className="text-center text-lg font-semibold text-slate-600">
                        Built for Knowledge Workers Who Value Privacy and Control.
                    </p>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
                        {benefits.map((benefit) => (
                            <div
                                key={benefit.name}
                                className="flex flex-col items-center justify-center gap-2 rounded-lg bg-white p-6"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-2xl">
                                    {benefit.icon}
                                </div>
                                <p className="text-sm font-medium text-slate-700">{benefit.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Features Section
function FeaturesSection() {
    const features = [
        {
            icon: '📋',
            title: 'Configurable Kanban Board',
            description:
                'Drag-and-drop task management with GTD-aligned columns, WIP limits, context filters, and project organization. Customize your workflow to match how you work.',
        },
        {
            icon: '📥',
            title: 'Rich Capture Mechanisms',
            description:
                'Capture tasks from anywhere: web interface, PWA, browser extension, mobile widget, or email via IMAP. Offline support ensures nothing gets lost.',
        },
        {
            icon: '🎯',
            title: 'GTD Clarification Wizard',
            description:
                'Guided workflow to process your inbox efficiently. Two-minute rule, next action definition, context assignment, and project linking—all with keyboard shortcuts.',
        },
        {
            icon: '⚙️',
            title: 'Automation & Rules Engine',
            description:
                'Powerful automation with triggers, conditions, and actions. Automatically organize tasks, apply tags, move columns, send notifications, and more—all self-hosted.',
        },
        {
            icon: '🔄',
            title: 'Recurring Templates',
            description:
                'Schedule recurring tasks with RRULE support. Weekly reviews, daily standups, or any pattern you need. Timezone-aware with DST handling.',
        },
        {
            icon: '📊',
            title: 'Analytics & Review',
            description:
                'LeanKit-style analytics: Cumulative Flow Diagrams, lead time, cycle time, throughput metrics, and stale task detection. Make data-driven improvements.',
        },
    ];

    return (
        <section className="bg-white py-24">
            <div className="mx-auto max-w-[1216px] px-4 md:px-28">
                <div className="mb-16 flex flex-col items-center gap-5 text-center">
                    <Badge className="w-fit bg-indigo-50 text-indigo-600">Core Features</Badge>
                    <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[36px] font-extrabold leading-[44px] tracking-[-0.504px] text-slate-800">
                        Everything you need for GTD productivity.
                    </h2>
                    <p className="max-w-[800px] text-[20px] font-normal leading-[1.6] text-slate-600">
                        A complete productivity system that combines Kanban visualization with
                        Getting Things Done methodology. Capture, clarify, organize, and review—all
                        in one self-hosted platform.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="flex flex-col items-center gap-5 text-center"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-2xl">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">{feature.title}</h3>
                            <p className="text-base font-normal leading-[1.6] text-slate-600">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Testimonials Section
function TestimonialsSection() {
    return (
        <section className="bg-slate-50 py-24">
            <div className="mx-auto max-w-[1216px] px-4 md:px-28">
                <div className="flex flex-col gap-12 lg:flex-row lg:items-center">
                    <div className="flex-1">
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                            <span className="text-2xl">💬</span>
                        </div>
                        <p className="mb-6 text-[36px] font-medium leading-[44px] tracking-[-0.504px] text-slate-800">
                            Finally, a productivity system that respects my data privacy while
                            giving me the GTD workflow I need. The automation rules save me hours
                            every week.
                        </p>
                        <div className="flex flex-col gap-1">
                            <p className="text-lg font-extrabold text-slate-800">
                                — Knowledge Worker
                            </p>
                            <p className="text-base font-medium text-slate-600">
                                Productivity Enthusiast
                            </p>
                        </div>
                    </div>
                    <div className="flex-1">
                        <img
                            alt="Testimonial avatar"
                            className="h-[320px] w-[320px] rounded-full object-cover"
                            src={imgAvatar}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

// Statistics Section
function StatisticsSection() {
    const stats = [
        { value: '<300ms', label: 'API Response Time' },
        { value: '99.5%', label: 'Uptime Target' },
        { value: '100%', label: 'Data Ownership' },
    ];

    return (
        <section className="bg-white py-24">
            <div className="mx-auto max-w-[800px] px-4 md:px-28">
                <div className="mb-16 flex flex-col items-center gap-5 text-center">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
                        <span className="text-3xl">📈</span>
                    </div>
                    <h2 className="text-[36px] font-extrabold leading-[44px] tracking-[-0.504px] text-slate-800">
                        Built for performance and reliability.
                    </h2>
                    <p className="text-[20px] font-normal leading-[1.6] text-slate-600">
                        Track your productivity with comprehensive analytics. Monitor lead time,
                        cycle time, throughput, and identify bottlenecks in your workflow. All data
                        stays on your infrastructure.
                    </p>
                </div>

                <div className="flex flex-col gap-8 border-t border-slate-300 pt-8 md:flex-row md:justify-between">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="flex flex-col items-center gap-4 text-center"
                        >
                            <p className="text-[60px] font-extrabold leading-[68px] tracking-[-1.08px] text-indigo-600">
                                {stat.value}
                            </p>
                            <p className="text-lg font-normal leading-[24px] tracking-[-0.144px] text-slate-600">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// CTA Section
function CtaSection() {
    return (
        <section className="bg-indigo-50 py-16">
            <div className="mx-auto max-w-[800px] px-4 text-center md:px-28">
                <h2 className="mb-5 text-[36px] font-extrabold leading-[44px] tracking-[-0.504px] text-slate-800">
                    Ready to take control of your productivity?
                </h2>
                <p className="mb-8 text-[20px] font-normal leading-[1.6] text-slate-600">
                    Deploy your own instance and start organizing your work with GTD principles.
                    Self-hosted, privacy-focused, and fully customizable to your workflow.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Button variant="outline" className="border-indigo-600 text-indigo-600" asChild>
                        <Link to="/login">Login</Link>
                    </Button>
                    <Button className="bg-indigo-600 text-white hover:bg-indigo-700" asChild>
                        <Link to="/signup">Get Started</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}

// Footer
function Footer() {
    return (
        <footer className="bg-white py-24">
            <div className="mx-auto max-w-[1216px] px-4 md:px-28">
                <div className="mb-8 flex flex-col items-center gap-10">
                    <Logo />
                    <nav className="flex flex-wrap items-center justify-center gap-6">
                        <Link
                            to="/"
                            className="text-base font-medium text-slate-600 hover:text-slate-800"
                        >
                            Home
                        </Link>
                        <Link
                            to="/login"
                            className="text-base font-medium text-slate-600 hover:text-slate-800"
                        >
                            Login
                        </Link>
                        <Link
                            to="/signup"
                            className="text-base font-medium text-slate-600 hover:text-slate-800"
                        >
                            Sign Up
                        </Link>
                    </nav>
                </div>
                <div className="border-t border-slate-300 pt-8">
                    <p className="text-center text-sm font-medium text-slate-400">
                        Personal Kanban + GTD. Self-hosted productivity system.
                    </p>
                </div>
            </div>
        </footer>
    );
}

// Main Home View
export default function HomeView() {
    return (
        <div className="flex min-h-screen flex-col bg-white">
            <HeroSection />
            <KeyBenefitsSection />
            <FeaturesSection />
            <TestimonialsSection />
            <StatisticsSection />
            <CtaSection />
            <Footer />
        </div>
    );
}
