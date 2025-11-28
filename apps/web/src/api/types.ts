export interface Column {
  id: string;
  name: string;
  type: string;
  position: number;
  wipLimit?: number | null;
}

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  columns: Column[];
}
