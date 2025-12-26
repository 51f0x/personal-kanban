import {
    type INestApplication,
    Injectable,
    type OnModuleDestroy,
    type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveApiPrismaClient } from './prisma-client-resolver';

// Lazy load Prisma client at runtime to avoid module-load-time path issues
let PrismaClientClass: typeof import('@prisma/client').PrismaClient | null = null;

function getPrismaClientClass(): typeof import('@prisma/client').PrismaClient {
    if (!PrismaClientClass) {
        PrismaClientClass = resolveApiPrismaClient();
    }
    return PrismaClientClass;
}

/**
 * API PrismaService
 * Provides database access for API container using API_DATABASE_URL
 * NOTE: This should NOT be imported in worker - use WorkerPrismaService instead
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    // Use a symbol to store the client to avoid Proxy interception
    private readonly _client: InstanceType<ReturnType<typeof getPrismaClientClass>>;
    
    constructor(private readonly configService: ConfigService) {
        const databaseUrl = configService.get<string>('API_DATABASE_URL') || 
                           configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
            throw new Error('API_DATABASE_URL or DATABASE_URL is not configured');
        }
        // Lazy load Prisma client at construction time
        const PrismaClient = getPrismaClientClass();
        // Use datasources override to work with both Prisma 5 and 7
        // For Prisma 7, you can optionally use adapter pattern for better performance
        this._client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
        
        // Create a proxy that forwards all property access to the client
        // except for our own methods (configService, _client, onModuleInit, etc.)
        return new Proxy(this, {
            get(target, prop: string | symbol) {
                // If it's a property of PrismaService itself, return it
                if (typeof prop === 'string' && (prop in target || prop.startsWith('_'))) {
                    return (target as unknown as Record<string, unknown>)[prop];
                }
                // Handle symbol properties
                if (typeof prop === 'symbol') {
                    const value = (target as unknown as Record<symbol, unknown>)[prop];
                    if (value !== undefined) {
                        return value;
                    }
                }
                // Otherwise, forward to the Prisma client
                if (typeof prop === 'string') {
                    const client = target._client as unknown as Record<string, unknown>;
                    const value = client[prop];
                    // Bind functions to the client instance so 'this' context is correct
                    if (typeof value === 'function') {
                        return value.bind(client);
                    }
                    return value;
                }
                return undefined;
            },
        }) as this;
    }

    async onModuleInit(): Promise<void> {
        await this._client.$connect();
    }

    /**
     * Enable shutdown hooks (API-specific, but safe to call from Worker)
     */
    async enableShutdownHooks(app: INestApplication): Promise<void> {
        this._client.$on('beforeExit' as never, async () => {
            await app.close();
        });
    }

    async onModuleDestroy(): Promise<void> {
        await this._client.$disconnect();
    }
}
