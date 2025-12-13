import type { CFDDataPoint } from '@/services/analytics';
import { useMemo } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface CFDChartProps {
    data: CFDDataPoint[];
}

const COLORS = [
    '#3b82f6', // indigo
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
];

export function CFDChart({ data }: CFDChartProps) {
    const chartData = useMemo(() => {
        if (data.length === 0) return [];

        // Get all unique column names
        const columnNames = new Set<string>();
        data.forEach((point) => {
            Object.keys(point.columns).forEach((col) => columnNames.add(col));
        });

        // Transform data for recharts
        return data.map((point) => {
            const entry: Record<string, string | number> = {
                date: new Date(point.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                }),
            };
            columnNames.forEach((col) => {
                entry[col] = point.columns[col] || 0;
            });
            return entry;
        });
    }, [data]);

    const columnNames = useMemo(() => {
        const names = new Set<string>();
        data.forEach((point) => {
            Object.keys(point.columns).forEach((col) => names.add(col));
        });
        return Array.from(names);
    }, [data]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <p className="text-sm">No data available</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                    {columnNames.map((col, index) => (
                        <linearGradient key={col} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="5%"
                                stopColor={COLORS[index % COLORS.length]}
                                stopOpacity={0.8}
                            />
                            <stop
                                offset="95%"
                                stopColor={COLORS[index % COLORS.length]}
                                stopOpacity={0.1}
                            />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                    }}
                />
                <Legend />
                {columnNames.map((col, index) => (
                    <Area
                        key={col}
                        type="monotone"
                        dataKey={col}
                        stackId="1"
                        stroke={COLORS[index % COLORS.length]}
                        fill={`url(#color${index})`}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
