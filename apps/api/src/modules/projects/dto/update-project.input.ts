export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string | null;
  desiredOutcome?: string | null;
  status?: string;
}
