import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { LeadCycleMetric } from '@/services/analytics';

interface LeadCycleChartProps {
  data: LeadCycleMetric[];
}

export function LeadCycleChart({ data }: LeadCycleChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    x: item.leadTimeDays,
    y: item.cycleTimeDays ?? item.leadTimeDays,
    title: item.title,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          type="number"
          dataKey="x"
          name="Lead Time"
          label={{ value: 'Lead Time (days)', position: 'insideBottom', offset: -5 }}
          stroke="#64748b"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Cycle Time"
          label={{ value: 'Cycle Time (days)', angle: -90, position: 'insideLeft' }}
          stroke="#64748b"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload;
              return (
                <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                  <p className="font-semibold text-sm mb-1">{data.title}</p>
                  <p className="text-xs text-slate-600">
                    Lead: {data.x.toFixed(1)} days
                  </p>
                  <p className="text-xs text-slate-600">
                    Cycle: {data.y.toFixed(1)} days
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Scatter name="Tasks" data={chartData} fill="#3b82f6">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill="#3b82f6" />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
