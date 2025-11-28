import { Prisma, TaskContext } from '@prisma/client';

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string | null;
  context?: TaskContext | null;
  waitingFor?: string | null;
  dueAt?: Date | null;
  needsBreakdown?: boolean;
  metadata?: Prisma.JsonValue | null;
  projectId?: string | null;
  columnId?: string;
  isDone?: boolean;
  tags?: string[];
}
