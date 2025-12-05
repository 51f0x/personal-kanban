import { apiGet } from './api';

export interface BoardSummary {
    boardId: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    inputTasks: number;
    staleTasks: number;
    completionRate: number;
}

export interface CFDDataPoint {
    timestamp: string;
    columns: Record<string, number>;
}

export interface ThroughputData {
    period: string;
    completed: number;
    created: number;
}

export interface LeadCycleMetric {
    taskId: string;
    title: string;
    leadTimeDays: number;
    cycleTimeDays: number | null;
    completedAt: string;
}

export interface WipBreaches {
    currentBreaches: Array<{
        columnId: string;
        columnName: string;
        currentCount: number;
        wipLimit: number | null;
        exceededBy: number;
    }>;
    totalColumns: number;
    breachingColumns: number;
}

export async function fetchBoardSummary(boardId: string): Promise<BoardSummary> {
    return apiGet<BoardSummary>(`/boards/${boardId}/analytics/summary`);
}

export async function fetchCFDData(boardId: string, days = 30): Promise<CFDDataPoint[]> {
    return apiGet<CFDDataPoint[]>(`/boards/${boardId}/analytics/cfd?days=${days}`);
}

export async function fetchThroughput(
    boardId: string,
    period: 'day' | 'week' = 'week',
    periods = 12,
): Promise<ThroughputData[]> {
    return apiGet<ThroughputData[]>(
        `/boards/${boardId}/analytics/throughput?period=${period}&periods=${periods}`,
    );
}

export async function fetchLeadCycleMetrics(
    boardId: string,
    limit = 50,
): Promise<LeadCycleMetric[]> {
    return apiGet<LeadCycleMetric[]>(`/boards/${boardId}/analytics/lead-cycle?limit=${limit}`);
}

export async function fetchWipBreaches(boardId: string): Promise<WipBreaches> {
    return apiGet<WipBreaches>(`/boards/${boardId}/analytics/wip-breaches`);
}
