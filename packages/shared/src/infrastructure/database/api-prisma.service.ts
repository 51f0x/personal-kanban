import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

/**
 * API Database PrismaService
 * Provides read-only access to the API database (domain data)
 * Used by worker services that need to access users, tasks, boards, etc.
 */
@Injectable()
export class ApiPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(private readonly configService: ConfigService) {
        const databaseUrl = configService.get<string>('API_DATABASE_URL');
        if (!databaseUrl) {
            throw new Error('API_DATABASE_URL is not configured');
        }
        super({ datasources: { db: { url: databaseUrl } } });
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }
}
