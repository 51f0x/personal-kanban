import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: (config.get<number>('RATE_LIMIT_TTL') || 60) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX') || 100,
          },
          {
            name: 'capture',
            ttl: (config.get<number>('RATE_LIMIT_TTL') || 60) * 1000,
            limit: config.get<number>('CAPTURE_RATE_LIMIT_MAX') || 60,
          },
        ],
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class RateLimitModule {}
