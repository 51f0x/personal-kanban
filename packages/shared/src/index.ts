// ============================================================
// Health Check Types
// ============================================================
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version?: string;
  checks?: {
    database?: { status: 'ok' | 'error'; latencyMs?: number; error?: string };
    redis?: { status: 'ok' | 'error'; latencyMs?: number; error?: string };
  };
}

// ============================================================
// Capture Types
// ============================================================
export interface CaptureParseResult {
  title: string;
  description?: string;
  metadata: Record<string, unknown>;
}

const urlRegex = /(https?:\/\/[^\s]+)/i;

export function parseCaptureText(text: string): CaptureParseResult {
  const urlMatch = text.match(urlRegex);
  const url = urlMatch?.[0];
  const title = (text.replace(urlRegex, '').trim() || url || 'Captured item').slice(0, 120);

  return {
    title,
    description: text.trim(),
    metadata: {
      url,
      raw: text,
      extractedAt: new Date().toISOString(),
    },
  };
}

// ============================================================
// Column Types
// ============================================================
export type ColumnType = 'INPUT' | 'CLARIFY' | 'CONTEXT' | 'WAITING' | 'SOMEDAY' | 'DONE' | 'ARCHIVE';

export interface Column {
  id: string;
  boardId: string;
  name: string;
  type: ColumnType;
  wipLimit: number | null;
  position: number;
}

// ============================================================
// Task Types
// ============================================================
export type TaskContext = 'EMAIL' | 'MEETING' | 'PHONE' | 'READ' | 'WATCH' | 'DESK' | 'OTHER';

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  ownerId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  context?: TaskContext | null;
  waitingFor?: string | null;
  dueAt?: Date | null;
  needsBreakdown: boolean;
  metadata?: Record<string, unknown> | null;
  isDone: boolean;
  stale: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  lastMovedAt: Date;
}

// ============================================================
// WIP Status Types
// ============================================================
export interface WipStatus {
  columnId: string;
  columnName: string;
  currentCount: number;
  wipLimit: number | null;
  allowed: boolean;
  wouldExceed: boolean;
}

// ============================================================
// Rule Types
// ============================================================
export type RuleTriggerType = 'task.created' | 'task.moved' | 'task.completed' | 'stale' | 'schedule' | 'email.received';

export interface RuleTrigger {
  type: RuleTriggerType;
  config?: {
    schedule?: string;
    staleThreshold?: number;
    fromColumn?: string;
    toColumn?: string;
  };
}

export type RuleOperator = 'eq' | 'ne' | 'contains' | 'in' | 'notIn' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'exists' | 'notExists';

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
}

export type RuleActionType = 'createTask' | 'updateTask' | 'moveTask' | 'addTag' | 'removeTag' | 'addChecklist' | 'notify' | 'stop';

export interface RuleAction {
  type: RuleActionType;
  config: Record<string, unknown>;
}

// ============================================================
// Analytics Types
// ============================================================
export interface CFDDataPoint {
  timestamp: Date;
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
  completedAt: Date;
}

// ============================================================
// WebSocket Event Types
// ============================================================
export type BoardUpdateType = 
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.deleted'
  | 'task.clarified'
  | 'wip.breach'
  | 'rule.triggered';

export interface BoardUpdateEvent {
  type: BoardUpdateType;
  taskId?: string;
  fromColumnId?: string;
  toColumnId?: string;
  timestamp: string;
  [key: string]: unknown;
}
