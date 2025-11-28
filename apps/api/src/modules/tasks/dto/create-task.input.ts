import { Prisma, TaskContext } from '@prisma/client';

export interface ChecklistItemInput {
  title: string;
  isDone?: boolean;
  position?: number;
}

export interface CreateTaskInput {
  boardId: string;
  columnId: string;
  ownerId: string;
  title: string;
  description?: string;
  projectId?: string;
  context?: TaskContext;
  waitingFor?: string;
  dueAt?: Date;
  needsBreakdown?: boolean;
  metadata?: Prisma.JsonValue;
  checklist?: ChecklistItemInput[];
  tags?: string[];
}
