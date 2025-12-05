import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.input';
import { UpdateTaskDto } from './dto/update-task.input';
import { MoveTaskDto } from './dto/move-task.input';

@ApiTags('tasks')
@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('tasks/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get task', description: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task information' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  getTask(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.getTaskById(id);
  }

  @Get('boards/:boardId/tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tasks for board', description: 'Get all tasks for a specific board' })
  @ApiParam({ name: 'boardId', description: 'Board ID (UUID)' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  listTasks(@Param('boardId', ParseUUIDPipe) boardId: string) {
    return this.taskService.listTasksForBoard(boardId);
  }

  @Get('boards/:boardId/tasks/stale')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get stale tasks', description: 'Get tasks that have not been updated for a specified number of days' })
  @ApiParam({ name: 'boardId', description: 'Board ID (UUID)' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days threshold (default: 7)' })
  @ApiResponse({ status: 200, description: 'List of stale tasks' })
  getStaleTasks(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Query('days') days?: string,
  ) {
    const thresholdDays = days ? Number.parseInt(days, 10) : 7;
    return this.taskService.getStaleTasks(boardId, thresholdDays);
  }

  @Post('tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create task', description: 'Create a new task' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  createTask(@Body() dto: CreateTaskDto) {
    return this.taskService.createTask(dto);
  }

  @Patch('tasks/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update task', description: 'Update an existing task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  updateTask(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(id, dto);
  }

  @Post('tasks/:id/move')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move task', description: 'Move a task to a different column or position' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiBody({ type: MoveTaskDto })
  @ApiResponse({ status: 200, description: 'Task moved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  moveTask(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveTaskDto) {
    return this.taskService.moveTask(id, dto);
  }

  @Delete('tasks/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete task', description: 'Delete a task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  deleteTask(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.deleteTask(id);
  }
}
