import { Controller, Get } from '@nestjs/common';
import { HealthStatus } from '@personal-kanban/shared';

@Controller('health')
export class HealthController {
  @Get()
  getStatus(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
