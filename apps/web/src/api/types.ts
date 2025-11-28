export type ColumnType = 'INPUT' | 'CLARIFY' | 'CONTEXT' | 'WAITING' | 'SOMEDAY' | 'DONE' | 'ARCHIVE';
export type TaskContext = 'EMAIL' | 'MEETING' | 'PHONE' | 'READ' | 'WATCH' | 'DESK' | 'OTHER';

export interface Column {
  id: string;
  boardId: string;
  name: string;
  type: ColumnType;
  position: number;
  wipLimit?: number | null;
  _count?: { tasks: number };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  isDone: boolean;
  position: number;
}

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
  dueAt?: string | null;
  needsBreakdown: boolean;
  metadata?: Record<string, unknown> | null;
  isDone: boolean;
  stale: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  lastMovedAt: string;
  column?: Column;
  project?: Project | null;
  tags?: Array<{ tag: Tag }>;
  checklist?: ChecklistItem[];
}

export interface Board {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  columns: Column[];
  projects?: Project[];
}

export interface WipStatus {
  columnId: string;
  columnName: string;
  currentCount: number;
  wipLimit: number | null;
  allowed: boolean;
  wouldExceed: boolean;
}

export interface MoveTaskResult {
  task: {
    id: string;
    title: string;
    columnId: string;
    boardId: string;
  };
  wipStatus: {
    columnId: string;
    columnName: string;
    currentCount: number;
    wipLimit: number | null;
    atLimit: boolean;
  };
  fromColumnId: string | null;
}
