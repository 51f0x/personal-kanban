import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as connectRedis from 'connect-redis';
import type * as session from 'express-session';

const RedisStore = connectRedis.default || connectRedis;

/**
 * Service for managing session store configuration
 */
@Injectable()
export class SessionStoreService {
    private redisClient: Redis;

    constructor(private readonly config: ConfigService) {
        const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
        this.redisClient = new Redis(redisUrl, {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
    }

    /**
     * Get Redis client instance
     */
    getRedisClient(): Redis {
        return this.redisClient;
    }

    /**
     * Create session store configuration
     */
    createStore(): session.Store {
        return new RedisStore({
            client: this.redisClient,
            prefix: 'pk:sess:',
            ttl: 86400, // 24 hours
        });
    }

    /**
     * Get session configuration
     */
    getSessionConfig(): session.SessionOptions {
        return {
            store: this.createStore(),
            secret: this.config.get<string>('SESSION_SECRET', 'change-me-in-production'),
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                secure: this.config.get<string>('NODE_ENV') === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
            },
            name: 'pk.sid',
        };
    }
}
