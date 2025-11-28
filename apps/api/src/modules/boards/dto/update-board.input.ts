import { Prisma } from '@prisma/client';

export interface UpdateBoardInput {
  id: string;
  name?: string;
  description?: string | null;
  config?: Prisma.JsonValue | null;
}
