import { Controller, Get, Query, BadRequestException, NotFoundException, Redirect, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { EmailActionsService } from './email-actions.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('email-actions')
@Controller('email-actions')
export class EmailActionsController {
  private readonly logger = new Logger(EmailActionsController.name);
  private readonly webUrl: string;

  constructor(
    private readonly emailActionsService: EmailActionsService,
    private readonly configService: ConfigService,
  ) {
    this.webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:5173');
  }

  @Get('complete')
  @ApiOperation({
    summary: 'Complete task via email link',
    description: 'Marks a task as complete using a secure token from an email link',
  })
  @ApiQuery({ name: 'token', description: 'Secure token from email link', required: true })
  @ApiResponse({ status: 302, description: 'Redirects to task view after completion' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Redirect()
  async completeTask(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    try {
      const result = await this.emailActionsService.completeTaskByToken(token);

      if (!result.success) {
        throw new BadRequestException(result.error || 'Failed to complete task');
      }

      // Redirect to the task view in the web app
      const redirectUrl = `${this.webUrl}/boards/${result.boardId}?task=${result.taskId}&completed=true`;
      this.logger.log(`Task ${result.taskId} completed via email link, redirecting to ${redirectUrl}`);

      return { url: redirectUrl, statusCode: 302 };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Error completing task via email link', error);
      throw new BadRequestException('Failed to complete task');
    }
  }

  @Get('view')
  @ApiOperation({
    summary: 'View task via email link',
    description: 'Redirects to task view using a secure token from an email link',
  })
  @ApiQuery({ name: 'token', description: 'Secure token from email link', required: true })
  @ApiResponse({ status: 302, description: 'Redirects to task view' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Redirect()
  async viewTask(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    try {
      const result = await this.emailActionsService.getTaskByToken(token);

      if (!result.success) {
        throw new BadRequestException(result.error || 'Failed to get task');
      }

      // Redirect to the task view in the web app
      const redirectUrl = `${this.webUrl}/boards/${result.boardId}?task=${result.taskId}`;
      this.logger.log(`Redirecting to task view: ${redirectUrl}`);

      return { url: redirectUrl, statusCode: 302 };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Error viewing task via email link', error);
      throw new BadRequestException('Failed to view task');
    }
  }
}
