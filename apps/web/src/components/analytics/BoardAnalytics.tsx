import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, TrendingUp, CheckCircle2, Clock, Inbox, AlertTriangle } from 'lucide-react';
import {
  fetchBoardSummary,
  fetchThroughput,
  fetchCFDData,
  fetchLeadCycleMetrics,
  fetchWipBreaches,
  type BoardSummary,
  type ThroughputData,
  type CFDDataPoint,
  type LeadCycleMetric,
  type WipBreaches,
} from '@/services/analytics';
import { ThroughputChart } from './ThroughputChart';
import { CFDChart } from './CFDChart';
import { LeadCycleChart } from './LeadCycleChart';
import { SummaryCards } from './SummaryCards';

interface BoardAnalyticsProps {
  boardId: string;
}

export function BoardAnalytics({ boardId }: BoardAnalyticsProps) {
  const [summary, setSummary] = useState<BoardSummary | null>(null);
  const [throughput, setThroughput] = useState<ThroughputData[]>([]);
  const [cfd, setCfd] = useState<CFDDataPoint[]>([]);
  const [leadCycle, setLeadCycle] = useState<LeadCycleMetric[]>([]);
  const [wipBreaches, setWipBreaches] = useState<WipBreaches | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, throughputData, cfdData, leadCycleData, wipData] = await Promise.all([
          fetchBoardSummary(boardId),
          fetchThroughput(boardId, 'week', 12),
          fetchCFDData(boardId, 30),
          fetchLeadCycleMetrics(boardId, 50),
          fetchWipBreaches(boardId),
        ]);

        setSummary(summaryData);
        setThroughput(throughputData);
        setCfd(cfdData);
        setLeadCycle(leadCycleData);
        setWipBreaches(wipData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    if (boardId) {
      loadAnalytics();
    }
  }, [boardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="size-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {summary && <SummaryCards summary={summary} wipBreaches={wipBreaches} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Throughput</h3>
          <ThroughputChart data={throughput} />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cumulative Flow Diagram</h3>
          <CFDChart data={cfd} />
        </Card>
      </div>

      {leadCycle.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Time & Cycle Time</h3>
          <LeadCycleChart data={leadCycle} />
        </Card>
      )}
    </div>
  );
}
