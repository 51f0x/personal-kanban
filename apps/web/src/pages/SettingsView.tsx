import { AppSidebar } from '@/components/AppSidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
    AlertCircle,
    ArrowLeft,
    Bell,
    CheckCircle2,
    Eye,
    EyeOff,
    Key,
    Lock,
    Mail,
    Palette,
    Save,
    User,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'integrations' | 'appearance' | 'api';

const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
];

export default function SettingsView() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [loading, setLoading] = useState(false);
    const [showSearchDialog, setShowSearchDialog] = useState(false);

    // Profile state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [timezone, setTimezone] = useState('UTC');

    // Security state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Notification preferences
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [inAppNotifications, setInAppNotifications] = useState(true);
    const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
    const [quietHoursStart, setQuietHoursStart] = useState('22:00');
    const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

    // Integration settings
    const [imapHost, setImapHost] = useState('');
    const [imapPort, setImapPort] = useState('993');
    const [imapUsername, setImapUsername] = useState('');
    const [imapPassword, setImapPassword] = useState('');
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState('587');
    const [smtpUsername, setSmtpUsername] = useState('');
    const [smtpPassword, setSmtpPassword] = useState('');

    // Appearance
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

    // API tokens
    const [captureToken, setCaptureToken] = useState('');
    const [showCaptureToken, setShowCaptureToken] = useState(false);

    // Load user data
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setTimezone(user.timezone || 'UTC');
        }
    }, [user]);

    // Load settings from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
        if (savedTheme) setTheme(savedTheme);

        const savedNotifications = localStorage.getItem('emailNotifications');
        if (savedNotifications !== null) setEmailNotifications(savedNotifications === 'true');

        const savedCaptureToken = localStorage.getItem('capture_token');
        if (savedCaptureToken) setCaptureToken(savedCaptureToken);
    }, []);

    const handleSaveProfile = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // TODO: Implement API call to update user profile
            // await updateUser(user.id, { name, email, timezone });
            toast.success('Profile updated successfully');
            await refreshUser();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            toast.error('Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            // TODO: Implement API call to change password
            // await changePassword({ currentPassword, newPassword });
            toast.success('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotifications = () => {
        localStorage.setItem('emailNotifications', String(emailNotifications));
        localStorage.setItem('inAppNotifications', String(inAppNotifications));
        localStorage.setItem('quietHoursEnabled', String(quietHoursEnabled));
        localStorage.setItem('quietHoursStart', quietHoursStart);
        localStorage.setItem('quietHoursEnd', quietHoursEnd);
        toast.success('Notification preferences saved');
    };

    const handleSaveIntegrations = () => {
        // TODO: Implement API call to save IMAP/SMTP settings
        toast.success('Integration settings saved');
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        // Apply theme to document
        if (newTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.classList.toggle('dark', prefersDark);
        } else {
            document.documentElement.classList.toggle('dark', newTheme === 'dark');
        }
        toast.success('Theme updated');
    };

    const generateCaptureToken = () => {
        const token = `pk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        setCaptureToken(token);
        localStorage.setItem('capture_token', token);
        toast.success('New capture token generated');
    };

    const tabs: Array<{ id: SettingsTab; label: string; icon: typeof User }> = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'integrations', label: 'Integrations', icon: Mail },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'api', label: 'API & Tokens', icon: Key },
    ];

    const handleSearchClick = () => {
        // Since we're on settings page, navigate to user's first board or show message
        if (user?.id) {
            // Try to get first board - for now just show a message
            toast.info('Search is available on board pages. Navigate to a board to search tasks.');
        } else {
            toast.info('Please log in and navigate to a board to search tasks.');
        }
    };

    return (
        <SidebarProvider defaultOpen={true}>
            <SettingsViewContent
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tabs={tabs}
                user={user}
                refreshUser={refreshUser}
                loading={loading}
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                timezone={timezone}
                setTimezone={setTimezone}
                currentPassword={currentPassword}
                setCurrentPassword={setCurrentPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showCurrentPassword={showCurrentPassword}
                setShowCurrentPassword={setShowCurrentPassword}
                showNewPassword={showNewPassword}
                setShowNewPassword={setShowNewPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                emailNotifications={emailNotifications}
                setEmailNotifications={setEmailNotifications}
                inAppNotifications={inAppNotifications}
                setInAppNotifications={setInAppNotifications}
                quietHoursEnabled={quietHoursEnabled}
                setQuietHoursEnabled={setQuietHoursEnabled}
                quietHoursStart={quietHoursStart}
                setQuietHoursStart={setQuietHoursStart}
                quietHoursEnd={quietHoursEnd}
                setQuietHoursEnd={setQuietHoursEnd}
                imapHost={imapHost}
                setImapHost={setImapHost}
                imapPort={imapPort}
                setImapPort={setImapPort}
                imapUsername={imapUsername}
                setImapUsername={setImapUsername}
                imapPassword={imapPassword}
                setImapPassword={setImapPassword}
                smtpHost={smtpHost}
                setSmtpHost={setSmtpHost}
                smtpPort={smtpPort}
                setSmtpPort={setSmtpPort}
                smtpUsername={smtpUsername}
                setSmtpUsername={setSmtpUsername}
                smtpPassword={smtpPassword}
                setSmtpPassword={setSmtpPassword}
                theme={theme}
                captureToken={captureToken}
                setCaptureToken={setCaptureToken}
                showCaptureToken={showCaptureToken}
                setShowCaptureToken={setShowCaptureToken}
                handleSaveProfile={handleSaveProfile}
                handleChangePassword={handleChangePassword}
                handleSaveNotifications={handleSaveNotifications}
                handleSaveIntegrations={handleSaveIntegrations}
                handleThemeChange={handleThemeChange}
                generateCaptureToken={generateCaptureToken}
                handleSearchClick={handleSearchClick}
            />
        </SidebarProvider>
    );
}

function SettingsViewContent({
    activeTab,
    setActiveTab,
    tabs,
    user,
    refreshUser,
    loading,
    name,
    setName,
    email,
    setEmail,
    timezone,
    setTimezone,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    emailNotifications,
    setEmailNotifications,
    inAppNotifications,
    setInAppNotifications,
    quietHoursEnabled,
    setQuietHoursEnabled,
    quietHoursStart,
    setQuietHoursStart,
    quietHoursEnd,
    setQuietHoursEnd,
    imapHost,
    setImapHost,
    imapPort,
    setImapPort,
    imapUsername,
    setImapUsername,
    imapPassword,
    setImapPassword,
    smtpHost,
    setSmtpHost,
    smtpPort,
    setSmtpPort,
    smtpUsername,
    setSmtpUsername,
    smtpPassword,
    setSmtpPassword,
    theme,
    captureToken,
    setCaptureToken,
    showCaptureToken,
    setShowCaptureToken,
    handleSaveProfile,
    handleChangePassword,
    handleSaveNotifications,
    handleSaveIntegrations,
    handleThemeChange,
    generateCaptureToken,
    handleSearchClick,
}: {
    activeTab: SettingsTab;
    setActiveTab: (tab: SettingsTab) => void;
    tabs: Array<{ id: SettingsTab; label: string; icon: typeof User }>;
    user: { id?: string; name?: string; email?: string; timezone?: string } | null;
    refreshUser: () => Promise<void>;
    loading: boolean;
    name: string;
    setName: (name: string) => void;
    email: string;
    setEmail: (email: string) => void;
    timezone: string;
    setTimezone: (tz: string) => void;
    currentPassword: string;
    setCurrentPassword: (pwd: string) => void;
    newPassword: string;
    setNewPassword: (pwd: string) => void;
    confirmPassword: string;
    setConfirmPassword: (pwd: string) => void;
    showCurrentPassword: boolean;
    setShowCurrentPassword: (show: boolean) => void;
    showNewPassword: boolean;
    setShowNewPassword: (show: boolean) => void;
    showConfirmPassword: boolean;
    setShowConfirmPassword: (show: boolean) => void;
    emailNotifications: boolean;
    setEmailNotifications: (enabled: boolean) => void;
    inAppNotifications: boolean;
    setInAppNotifications: (enabled: boolean) => void;
    quietHoursEnabled: boolean;
    setQuietHoursEnabled: (enabled: boolean) => void;
    quietHoursStart: string;
    setQuietHoursStart: (time: string) => void;
    quietHoursEnd: string;
    setQuietHoursEnd: (time: string) => void;
    imapHost: string;
    setImapHost: (host: string) => void;
    imapPort: string;
    setImapPort: (port: string) => void;
    imapUsername: string;
    setImapUsername: (username: string) => void;
    imapPassword: string;
    setImapPassword: (pwd: string) => void;
    smtpHost: string;
    setSmtpHost: (host: string) => void;
    smtpPort: string;
    setSmtpPort: (port: string) => void;
    smtpUsername: string;
    setSmtpUsername: (username: string) => void;
    smtpPassword: string;
    setSmtpPassword: (pwd: string) => void;
    theme: 'light' | 'dark' | 'system';
    captureToken: string;
    setCaptureToken: (token: string) => void;
    showCaptureToken: boolean;
    setShowCaptureToken: (show: boolean) => void;
    handleSaveProfile: () => Promise<void>;
    handleChangePassword: () => Promise<void>;
    handleSaveNotifications: () => void;
    handleSaveIntegrations: () => void;
    handleThemeChange: (theme: 'light' | 'dark' | 'system') => void;
    generateCaptureToken: () => void;
    handleSearchClick: () => void;
}) {
    const navigate = useNavigate();
    const { open } = useSidebar();

    return (
        <div className="flex h-screen w-full bg-slate-50">
            {open && <AppSidebar />}
            <div className="flex flex-col flex-1 overflow-auto">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-8 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800">Settings</h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Manage your account and preferences
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            {/* Sidebar Navigation */}
                            <div className="lg:col-span-1">
                                <Card>
                                    <CardContent className="p-0">
                                        <nav className="flex flex-col p-2">
                                            {tabs.map((tab) => {
                                                const Icon = tab.icon;
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setActiveTab(tab.id)}
                                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                                                            activeTab === tab.id
                                                                ? 'bg-indigo-50 text-indigo-700 font-medium'
                                                                : 'text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                        <span>{tab.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </nav>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Main Content */}
                            <div className="lg:col-span-3 space-y-6">
                                {/* Profile Tab */}
                                {activeTab === 'profile' && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Profile Information</CardTitle>
                                            <CardDescription>
                                                Update your personal information and preferences
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">Full Name</Label>
                                                <Input
                                                    id="name"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Enter your full name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email Address</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="Enter your email"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="timezone">Timezone</Label>
                                                <Select
                                                    value={timezone}
                                                    onValueChange={setTimezone}
                                                >
                                                    <SelectTrigger id="timezone">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TIMEZONES.map((tz) => (
                                                            <SelectItem key={tz} value={tz}>
                                                                {tz}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Separator />
                                            <Button onClick={handleSaveProfile} disabled={loading}>
                                                <Save className="h-4 w-4 mr-2" />
                                                {loading ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Security Tab */}
                                {activeTab === 'security' && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Security & Password</CardTitle>
                                            <CardDescription>
                                                Change your password and manage security settings
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="currentPassword">
                                                    Current Password
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="currentPassword"
                                                        type={
                                                            showCurrentPassword
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                        value={currentPassword}
                                                        onChange={(e) =>
                                                            setCurrentPassword(e.target.value)
                                                        }
                                                        placeholder="Enter current password"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-0 top-0 h-full"
                                                        onClick={() =>
                                                            setShowCurrentPassword(
                                                                !showCurrentPassword,
                                                            )
                                                        }
                                                    >
                                                        {showCurrentPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="newPassword">New Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="newPassword"
                                                        type={showNewPassword ? 'text' : 'password'}
                                                        value={newPassword}
                                                        onChange={(e) =>
                                                            setNewPassword(e.target.value)
                                                        }
                                                        placeholder="Enter new password"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-0 top-0 h-full"
                                                        onClick={() =>
                                                            setShowNewPassword(!showNewPassword)
                                                        }
                                                    >
                                                        {showNewPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Password must be at least 8 characters long
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword">
                                                    Confirm New Password
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="confirmPassword"
                                                        type={
                                                            showConfirmPassword
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                        value={confirmPassword}
                                                        onChange={(e) =>
                                                            setConfirmPassword(e.target.value)
                                                        }
                                                        placeholder="Confirm new password"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-0 top-0 h-full"
                                                        onClick={() =>
                                                            setShowConfirmPassword(
                                                                !showConfirmPassword,
                                                            )
                                                        }
                                                    >
                                                        {showConfirmPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                            <Separator />
                                            <Button
                                                onClick={handleChangePassword}
                                                disabled={loading}
                                            >
                                                <Lock className="h-4 w-4 mr-2" />
                                                {loading ? 'Changing...' : 'Change Password'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Notifications Tab */}
                                {activeTab === 'notifications' && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Notification Preferences</CardTitle>
                                            <CardDescription>
                                                Configure how and when you receive notifications
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label>Email Notifications</Label>
                                                    <p className="text-sm text-slate-500">
                                                        Receive notifications via email
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={emailNotifications}
                                                    onCheckedChange={setEmailNotifications}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label>In-App Notifications</Label>
                                                    <p className="text-sm text-slate-500">
                                                        Show notifications in the application
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={inAppNotifications}
                                                    onCheckedChange={setInAppNotifications}
                                                />
                                            </div>
                                            <Separator />
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-0.5">
                                                        <Label>Quiet Hours</Label>
                                                        <p className="text-sm text-slate-500">
                                                            Disable notifications during specified
                                                            hours
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={quietHoursEnabled}
                                                        onCheckedChange={setQuietHoursEnabled}
                                                    />
                                                </div>
                                                {quietHoursEnabled && (
                                                    <div className="grid grid-cols-2 gap-4 pl-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="quietStart">
                                                                Start Time
                                                            </Label>
                                                            <Input
                                                                id="quietStart"
                                                                type="time"
                                                                value={quietHoursStart}
                                                                onChange={(e) =>
                                                                    setQuietHoursStart(
                                                                        e.target.value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="quietEnd">
                                                                End Time
                                                            </Label>
                                                            <Input
                                                                id="quietEnd"
                                                                type="time"
                                                                value={quietHoursEnd}
                                                                onChange={(e) =>
                                                                    setQuietHoursEnd(e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <Separator />
                                            <Button onClick={handleSaveNotifications}>
                                                <Save className="h-4 w-4 mr-2" />
                                                Save Preferences
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Integrations Tab */}
                                {activeTab === 'integrations' && (
                                    <div className="space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>IMAP Configuration</CardTitle>
                                                <CardDescription>
                                                    Configure email import settings for automatic
                                                    task creation
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="imapHost">IMAP Host</Label>
                                                        <Input
                                                            id="imapHost"
                                                            value={imapHost}
                                                            onChange={(e) =>
                                                                setImapHost(e.target.value)
                                                            }
                                                            placeholder="imap.example.com"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="imapPort">Port</Label>
                                                        <Input
                                                            id="imapPort"
                                                            type="number"
                                                            value={imapPort}
                                                            onChange={(e) =>
                                                                setImapPort(e.target.value)
                                                            }
                                                            placeholder="993"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="imapUsername">Username</Label>
                                                    <Input
                                                        id="imapUsername"
                                                        value={imapUsername}
                                                        onChange={(e) =>
                                                            setImapUsername(e.target.value)
                                                        }
                                                        placeholder="your-email@example.com"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="imapPassword">Password</Label>
                                                    <Input
                                                        id="imapPassword"
                                                        type="password"
                                                        value={imapPassword}
                                                        onChange={(e) =>
                                                            setImapPassword(e.target.value)
                                                        }
                                                        placeholder="Enter IMAP password"
                                                    />
                                                </div>
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <div className="flex items-start gap-3">
                                                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                                                        <div className="text-sm text-blue-800">
                                                            <p className="font-medium mb-1">Note</p>
                                                            <p>
                                                                IMAP settings are configured at the
                                                                server level. Contact your
                                                                administrator to set up email
                                                                integration.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>SMTP Configuration</CardTitle>
                                                <CardDescription>
                                                    Configure email sending settings for
                                                    notifications
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="smtpHost">SMTP Host</Label>
                                                        <Input
                                                            id="smtpHost"
                                                            value={smtpHost}
                                                            onChange={(e) =>
                                                                setSmtpHost(e.target.value)
                                                            }
                                                            placeholder="smtp.example.com"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="smtpPort">Port</Label>
                                                        <Input
                                                            id="smtpPort"
                                                            type="number"
                                                            value={smtpPort}
                                                            onChange={(e) =>
                                                                setSmtpPort(e.target.value)
                                                            }
                                                            placeholder="587"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="smtpUsername">Username</Label>
                                                    <Input
                                                        id="smtpUsername"
                                                        value={smtpUsername}
                                                        onChange={(e) =>
                                                            setSmtpUsername(e.target.value)
                                                        }
                                                        placeholder="your-email@example.com"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="smtpPassword">Password</Label>
                                                    <Input
                                                        id="smtpPassword"
                                                        type="password"
                                                        value={smtpPassword}
                                                        onChange={(e) =>
                                                            setSmtpPassword(e.target.value)
                                                        }
                                                        placeholder="Enter SMTP password"
                                                    />
                                                </div>
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <div className="flex items-start gap-3">
                                                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                                                        <div className="text-sm text-blue-800">
                                                            <p className="font-medium mb-1">Note</p>
                                                            <p>
                                                                SMTP settings are configured at the
                                                                server level. Contact your
                                                                administrator to set up email
                                                                notifications.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button onClick={handleSaveIntegrations}>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save Integration Settings
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Appearance Tab */}
                                {activeTab === 'appearance' && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Appearance</CardTitle>
                                            <CardDescription>
                                                Customize the look and feel of the application
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="space-y-4">
                                                <Label>Theme</Label>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleThemeChange('light')}
                                                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                                                            theme === 'light'
                                                                ? 'border-indigo-600 bg-indigo-50'
                                                                : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="font-medium mb-1">
                                                            Light
                                                        </div>
                                                        <div className="text-sm text-slate-600">
                                                            Light theme
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleThemeChange('dark')}
                                                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                                                            theme === 'dark'
                                                                ? 'border-indigo-600 bg-indigo-50'
                                                                : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="font-medium mb-1">Dark</div>
                                                        <div className="text-sm text-slate-600">
                                                            Dark theme
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleThemeChange('system')}
                                                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                                                            theme === 'system'
                                                                ? 'border-indigo-600 bg-indigo-50'
                                                                : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="font-medium mb-1">
                                                            System
                                                        </div>
                                                        <div className="text-sm text-slate-600">
                                                            Follow system
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* API & Tokens Tab */}
                                {activeTab === 'api' && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>API & Tokens</CardTitle>
                                            <CardDescription>
                                                Manage API tokens for capture endpoints and
                                                integrations
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-0.5">
                                                        <Label>Capture Token</Label>
                                                        <p className="text-sm text-slate-500">
                                                            Token for browser extension and capture
                                                            API
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        onClick={generateCaptureToken}
                                                    >
                                                        Generate New
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="captureToken">Token</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            id="captureToken"
                                                            type={
                                                                showCaptureToken
                                                                    ? 'text'
                                                                    : 'password'
                                                            }
                                                            value={captureToken}
                                                            readOnly
                                                            className="font-mono"
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() =>
                                                                setShowCaptureToken(
                                                                    !showCaptureToken,
                                                                )
                                                            }
                                                        >
                                                            {showCaptureToken ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(
                                                                    captureToken,
                                                                );
                                                                toast.success(
                                                                    'Token copied to clipboard',
                                                                );
                                                            }}
                                                        >
                                                            Copy
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                                    <div className="flex items-start gap-3">
                                                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                                                        <div className="text-sm text-amber-800">
                                                            <p className="font-medium mb-1">
                                                                Security Warning
                                                            </p>
                                                            <p>
                                                                Keep your tokens secure. Do not
                                                                share them publicly or commit them
                                                                to version control.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="space-y-2">
                                                <Label>API Endpoint</Label>
                                                <div className="p-3 bg-slate-50 rounded-lg font-mono text-sm">
                                                    {import.meta.env.VITE_API_URL ||
                                                        'http://localhost:3000/api/v1'}
                                                    /capture
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Use this endpoint with your capture token for
                                                    browser extensions and integrations
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
