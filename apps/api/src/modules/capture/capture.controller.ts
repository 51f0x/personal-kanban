import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { CaptureService } from './capture.service';
import { CaptureRequestDto } from './dto/capture-request.dto';
import { CaptureTokenGuard } from '../../guards/capture-token.guard';

@Controller('capture')
@UseGuards(CaptureTokenGuard)
export class CaptureController {
  constructor(private readonly captureService: CaptureService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute for capture
  async quickAdd(@Body() dto: CaptureRequestDto) {
    return this.captureService.quickAdd(dto);
  }
}
