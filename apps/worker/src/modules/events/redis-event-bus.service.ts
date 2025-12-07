import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IEventBus } from '@personal-kanban/shared';
import { DomainEvent } from '@personal-kanban/shared';
import Redis from 'ioredis';

/**
 * Redis Event Bus Implementation for Worker
 * Uses Redis Streams for reliable event publishing
 */
@Injectable()
export class RedisEventBus implements IEventBus, OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisEventBus.name);
    private readonly redis: Redis;
    private readonly streamName = 'domain-events';
    private readonly handlers = new Map<
        string,
        Set<(event: DomainEvent) => Promise<void> | void>
    >();

    constructor(redisUrl?: string) {
        this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.redis.on('error', (err) => {
            this.logger.error('Redis connection error:', err);
        });

        this.redis.on('connect', () => {
            this.logger.log('Connected to Redis');
        });
    }

    async onModuleInit() {
        // Ensure stream exists
        try {
            await this.redis.xgroup('CREATE', this.streamName, 'event-handlers', '0', 'MKSTREAM');
        } catch (error: any) {
            // Group already exists, that's fine
            if (!error.message.includes('BUSYGROUP')) {
                this.logger.warn('Could not create consumer group:', error.message);
            }
        }
    }

    async onModuleDestroy() {
        await this.redis.quit();
    }

    async publish(event: DomainEvent): Promise<void> {
        try {
            const eventData = {
                eventType: event.eventName,
                aggregateId: event.aggregateId,
                occurredOn: event.occurredOn.toISOString(),
                payload: JSON.stringify(event),
            };

            await this.redis.xadd(this.streamName, '*', ...Object.entries(eventData).flat());

            // Also call local handlers synchronously for immediate processing
            await this.callLocalHandlers(event);

            this.logger.debug(
                `Published event: ${event.eventName} for aggregate ${event.aggregateId}`,
            );
        } catch (error) {
            this.logger.error(`Failed to publish event ${event.eventName}:`, error);
            throw error;
        }
    }

    async publishAll(events: DomainEvent[]): Promise<void> {
        if (events.length === 0) return;

        try {
            const pipeline = this.redis.pipeline();

            for (const event of events) {
                const eventData = {
                    eventType: event.eventName,
                    aggregateId: event.aggregateId,
                    occurredOn: event.occurredOn.toISOString(),
                    payload: JSON.stringify(event),
                };

                pipeline.xadd(this.streamName, '*', ...Object.entries(eventData).flat());
            }

            await pipeline.exec();

            // Call local handlers for all events
            await Promise.all(events.map((event) => this.callLocalHandlers(event)));

            this.logger.debug(`Published ${events.length} events`);
        } catch (error) {
            this.logger.error(`Failed to publish events:`, error);
            throw error;
        }
    }

    subscribe<T extends DomainEvent>(
        eventType: new (...args: any[]) => T,
        handler: (event: T) => Promise<void> | void,
    ): void {
        const eventName = eventType.name;
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, new Set());
        }
        this.handlers.get(eventName)!.add(handler as (event: DomainEvent) => Promise<void> | void);
        this.logger.debug(`Subscribed handler for ${eventName}`);
    }

    unsubscribe<T extends DomainEvent>(
        eventType: new (...args: any[]) => T,
        handler: (event: T) => Promise<void> | void,
    ): void {
        const eventName = eventType.name;
        const handlers = this.handlers.get(eventName);
        if (handlers) {
            handlers.delete(handler as (event: DomainEvent) => Promise<void> | void);
            if (handlers.size === 0) {
                this.handlers.delete(eventName);
            }
        }
    }

    /**
     * Call local handlers for an event
     */
    private async callLocalHandlers(event: DomainEvent): Promise<void> {
        const handlers = this.handlers.get(event.eventName);
        if (handlers) {
            await Promise.all(
                Array.from(handlers).map(async (handler) => {
                    try {
                        await handler(event);
                    } catch (error) {
                        this.logger.error(`Error in event handler for ${event.eventName}:`, error);
                    }
                }),
            );
        }
    }
}
