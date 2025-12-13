import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IEventBus } from '@personal-kanban/shared';
import { RedisEventBus } from './redis-event-bus.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: RedisEventBus,
            useFactory: (configService: ConfigService) => {
                const redisUrl = configService.get<string>('REDIS_URL');
                return new RedisEventBus(redisUrl);
            },
            inject: [ConfigService],
        },
        {
            provide: 'IEventBus',
            useExisting: RedisEventBus,
        },
    ],
    exports: ['IEventBus'],
})
export class EventsModule {}
