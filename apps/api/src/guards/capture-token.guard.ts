import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard that validates the x-capture-token header for capture endpoints.
 * If CAPTURE_ACCESS_TOKEN is not configured, the guard allows all requests.
 */
@Injectable()
export class CaptureTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = this.config.get<string>('CAPTURE_ACCESS_TOKEN');

    // If no token is configured, allow all requests (for development)
    if (!expectedToken) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedToken = request.headers['x-capture-token'];

    if (!providedToken) {
      throw new UnauthorizedException({
        message: 'Missing capture token',
        code: 'CAPTURE_TOKEN_MISSING',
        hint: 'Include x-capture-token header in your request',
      });
    }

    if (providedToken !== expectedToken) {
      throw new UnauthorizedException({
        message: 'Invalid capture token',
        code: 'CAPTURE_TOKEN_INVALID',
      });
    }

    return true;
  }
}
