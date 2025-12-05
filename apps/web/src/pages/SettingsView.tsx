import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Phone,
    HelpCircle,
    Download,
    Upload,
    MoreVertical,
    FileText,
    CheckCircle2,
    XCircle,
    Edit,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AppSidebar } from '@/components/AppSidebar';

// Mock data for billing history
const billingHistory = [
    { id: 1, invoice: 'Invoice #011 - Jun 2026', date: 'June 25, 2026', status: 'Paid', amount: 'USD $25.00', plan: 'Basic' },
    { id: 2, invoice: 'Invoice #010 - May 2026', date: 'May 25, 2026', status: 'Paid', amount: 'USD $25.00', plan: 'Basic' },
    { id: 3, invoice: 'Invoice #009 - Apr 2026', date: 'April 25, 2026', status: 'Failed', amount: 'USD $25.00', plan: 'Pro' },
    { id: 4, invoice: 'Invoice #008 - Mar 2026', date: 'March 25, 2026', status: 'Paid', amount: 'USD $25.00', plan: 'Premium' },
    { id: 5, invoice: 'Invoice #007 - Feb 2026', date: 'February 25, 2026', status: 'Paid', amount: 'USD $25.00', plan: 'Elite' },
    { id: 6, invoice: 'Invoice #006 - Jan 2026', date: 'January 25, 2026', status: 'Paid', amount: 'USD $25.00', plan: 'Basic' },
    { id: 7, invoice: 'Invoice #005 - Dec 2025', date: 'December 25, 2025', status: 'Paid', amount: 'USD $25.00', plan: 'Basic' },
    { id: 8, invoice: 'Invoice #004 - Nov 2025', date: 'November 25, 2025', status: 'Paid', amount: 'USD $25.00', plan: 'Basic' },
];

// Progress Bar Component
function ProgressBar({ value, max }: { value: number; max: number }) {
    const percentage = (value / max) * 100;
    return (
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(percentage, 100)}%` }}
            />
        </div>
    );
}

export default function SettingsView() {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(billingHistory.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedHistory = billingHistory.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="flex h-screen w-full bg-slate-50">
            {/* Sidebar */}
            <AppSidebar />

            {/* Main Content */}
            <div className="flex flex-col flex-1 overflow-auto">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-8 py-8">
                    <div className="flex items-center justify-between mb-4">
                        <Link
                            to="/"
                            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Settings
                        </Link>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-10 w-10">
                                <Phone className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10">
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800">My Billing Settings</h1>
                </div>

                {/* Content */}
                <div className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Current Plan and Payment Method Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Current Plan Card */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <CardTitle className="text-xl font-bold">Current Plan (Basic)</CardTitle>
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Yearly
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-600">Active until 25 Jan 2027</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-bold text-slate-800">$18</span>
                                                <span className="text-sm text-slate-600">/mo</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Storage Usage */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">2.5gb out of 10gb remaining</span>
                                            <span className="font-medium text-slate-800">87%</span>
                                        </div>
                                        <ProgressBar value={7.5} max={10} />
                                    </div>

                                    {/* Team Members Usage */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">10 out of 20 team members remaining</span>
                                            <span className="font-medium text-slate-800">32%</span>
                                        </div>
                                        <ProgressBar value={10} max={20} />
                                    </div>

                                    {/* Warning Banner */}
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-100 rounded-full p-2">
                                                <HelpCircle className="h-5 w-5 text-red-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-red-800">Plan Almost Expired</p>
                                                <p className="text-xs text-red-600">Your plan almost expired. Please renew.</p>
                                            </div>
                                        </div>
                                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                                            Renew
                                        </Button>
                                    </div>

                                    <Button variant="link" className="p-0 text-indigo-600 font-bold">
                                        Go Pro Today
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Payment Method Card */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl font-bold mb-2">Payment Method</CardTitle>
                                            <p className="text-sm text-slate-600">Active until 25 Jan 2027</p>
                                        </div>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Credit Cards Display */}
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-6 text-white relative overflow-hidden">
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-8">
                                                    <span className="text-sm font-medium">slothui</span>
                                                    <div className="w-8 h-8 bg-white/20 rounded" />
                                                </div>
                                                <div className="mb-4">
                                                    <p className="text-xs text-indigo-200 mb-1">AZUNYAN U WU</p>
                                                    <p className="text-lg font-mono tracking-wider">0087 1157 0587 6187</p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs">08/11</span>
                                                    <span className="text-lg font-bold">VISA</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-gradient-to-br from-slate-300 to-slate-400 rounded-xl p-6 text-white relative overflow-hidden opacity-50">
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-8">
                                                    <span className="text-sm font-medium">slothui</span>
                                                    <div className="w-8 h-8 bg-white/20 rounded" />
                                                </div>
                                                <div className="mb-4">
                                                    <p className="text-xs text-slate-200 mb-1">AZUNYAN U WU</p>
                                                    <p className="text-lg font-mono tracking-wider">0087 1157 0587 6187</p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs">08/11</span>
                                                    <span className="text-lg font-bold">VISA</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Details */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-8 bg-white rounded border border-slate-200 flex items-center justify-center">
                                                <span className="text-xs font-bold text-slate-800">VISA</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-slate-800">Visa ending in 2212</p>
                                                <p className="text-xs text-slate-600">Expired in 08/2028</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Billing History */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <CardTitle className="text-xl font-bold">Billing History</CardTitle>
                                            <Badge variant="outline" className="bg-slate-100 text-slate-700">
                                                187 Total
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-600">Here you will see your billing history.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline">
                                            <Upload className="h-4 w-4 mr-2" />
                                            Export
                                        </Button>
                                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-3 px-4 text-sm font-bold text-slate-800">Invoice</th>
                                                <th className="text-left py-3 px-4 text-sm font-bold text-slate-800">Billing Date</th>
                                                <th className="text-left py-3 px-4 text-sm font-bold text-slate-800">Status</th>
                                                <th className="text-left py-3 px-4 text-sm font-bold text-slate-800">Amount</th>
                                                <th className="text-left py-3 px-4 text-sm font-bold text-slate-800">Plan</th>
                                                <th className="text-right py-3 px-4 text-sm font-bold text-slate-800" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedHistory.map((item) => (
                                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" className="rounded border-slate-300" />
                                                            <FileText className="h-5 w-5 text-slate-400" />
                                                            <span className="text-sm font-medium text-slate-800">{item.invoice}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-slate-600">{item.date}</td>
                                                    <td className="py-4 px-4">
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                item.status === 'Paid'
                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                    : 'bg-red-50 text-red-700 border-red-200'
                                                            }
                                                        >
                                                            {item.status === 'Paid' ? (
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            ) : (
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                            )}
                                                            {item.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-4 text-sm font-medium text-slate-800">{item.amount}</td>
                                                    <td className="py-4 px-4 text-sm text-slate-600">{item.plan}</td>
                                                    <td className="py-4 px-4 text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                                    <p className="text-sm text-slate-600">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, billingHistory.length)} of {billingHistory.length} results</p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((page) => (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={currentPage === page ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                                                    onClick={() => setCurrentPage(page)}
                                                >
                                                    {page}
                                                </Button>
                                            ))}
                                            <span className="px-2 text-slate-600">...</span>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(99)}>
                                                99
                                            </Button>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

