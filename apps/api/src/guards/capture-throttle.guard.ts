import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttle guard for capture endpoints that uses the 'capture' throttler config.
 * This provides stricter rate limiting for capture endpoints to prevent abuse.
 */
@Injectable()
export class CaptureThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Use IP + capture token combination as the tracker key
    const ip = req.ip as string;
    const token = (req.headers as Record<string, string>)?.['x-capture-token'] || 'anonymous';
    return `capture:${ip}:${token}`;
  }
}
