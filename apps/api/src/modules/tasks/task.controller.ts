import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.input';
import { UpdateTaskDto } from './dto/update-task.input';
import { MoveTaskDto } from './dto/move-task.input';

@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('tasks/:id')
  getTask(@Param('id') id: string) {
    return this.taskService.getTaskById(id);
  }

  @Get('boards/:boardId/tasks')
  listTasks(@Param('boardId') boardId: string) {
    return this.taskService.listTasksForBoard(boardId);
  }

  @Get('boards/:boardId/tasks/stale')
  getStaleTasks(
    @Param('boardId') boardId: string,
    @Query('days') days?: string,
  ) {
    const thresholdDays = days ? parseInt(days, 10) : 7;
    return this.taskService.getStaleTasks(boardId, thresholdDays);
  }

  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto) {
    return this.taskService.createTask(dto);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(id, dto);
  }

  @Post('tasks/:id/move')
  moveTask(@Param('id') id: string, @Body() dto: MoveTaskDto) {
    return this.taskService.moveTask(id, dto);
  }

  @Delete('tasks/:id')
  deleteTask(@Param('id') id: string) {
    return this.taskService.deleteTask(id);
  }
}
