import { Prisma } from '@prisma/client';

export interface CreateBoardInput {
  ownerId: string;
  name: string;
  description?: string;
  config?: Prisma.JsonValue;
}
