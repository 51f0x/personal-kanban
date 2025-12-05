import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { CaptureService } from './capture.service';
import { CaptureRequestDto } from './dto/capture-request.dto';
import { CaptureTokenGuard } from '../../guards/capture-token.guard';

@ApiTags('capture')
@Controller('capture')
@UseGuards(CaptureTokenGuard)
export class CaptureController {
  constructor(private readonly captureService: CaptureService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute for capture
  @ApiSecurity('capture-token')
  @ApiOperation({ summary: 'Quick add task', description: 'Quickly add a task via capture endpoint. Requires capture token authentication.' })
  @ApiBody({ type: CaptureRequestDto })
  @ApiResponse({ status: 201, description: 'Task captured successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Invalid capture token' })
  async quickAdd(@Body() dto: CaptureRequestDto) {
    return this.captureService.quickAdd(dto);
  }
}
