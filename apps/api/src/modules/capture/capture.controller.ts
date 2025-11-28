import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaptureService } from './capture.service';
import { CaptureRequestDto } from './dto/capture-request.dto';

@Controller('capture')
export class CaptureController {
  private readonly token?: string;

  constructor(private readonly captureService: CaptureService, configService: ConfigService) {
    this.token = configService.get<string>('CAPTURE_ACCESS_TOKEN');
  }

  private validateToken(headerValue?: string) {
    if (!this.token) {
      return;
    }
    if (!headerValue || headerValue !== this.token) {
      throw new UnauthorizedException('Invalid capture token');
    }
  }

  @Post()
  async quickAdd(
    @Headers('x-capture-token') token: string | undefined,
    @Body() dto: CaptureRequestDto,
  ) {
    this.validateToken(token);
    return this.captureService.quickAdd(dto);
  }
}
