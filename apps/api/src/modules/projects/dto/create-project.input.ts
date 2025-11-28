export interface CreateProjectInput {
  boardId: string;
  ownerId: string;
  name: string;
  description?: string;
  desiredOutcome?: string;
}
