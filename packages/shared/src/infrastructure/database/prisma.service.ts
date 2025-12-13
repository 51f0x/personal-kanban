import {
    type INestApplication,
    Injectable,
    type OnModuleDestroy,
    type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

/**
 * Shared PrismaService
 * Provides database access for both API and Worker containers
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(private readonly configService: ConfigService) {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
            throw new Error('DATABASE_URL is not configured');
        }
        // Use datasources override to work with both Prisma 5 and 7
        // For Prisma 7, you can optionally use adapter pattern for better performance
        super({ datasources: { db: { url: databaseUrl } } });
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
    }

    /**
     * Enable shutdown hooks (API-specific, but safe to call from Worker)
     */
    async enableShutdownHooks(app: INestApplication): Promise<void> {
        this.$on('beforeExit' as never, async () => {
            await app.close();
        });
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }
}
