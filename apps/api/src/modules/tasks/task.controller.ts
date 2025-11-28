import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.input';
import { UpdateTaskDto } from './dto/update-task.input';

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

  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto) {
    return this.taskService.createTask(dto);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(id, dto);
  }
}
