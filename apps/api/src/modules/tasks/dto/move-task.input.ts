import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class MoveTaskDto {
  @IsUUID('4')
  columnId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  forceWipOverride?: boolean;
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
