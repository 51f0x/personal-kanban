import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService as ApiPrismaService } from './prisma.service';

/**
 * API DatabaseModule
 * Provides PrismaService for API container
 * NOTE: Do NOT use this in worker - use WorkerDatabaseModule instead
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        ApiPrismaService,
        {
            provide: 'PrismaService',
            useExisting: ApiPrismaService,
        },
    ],
    exports: [ApiPrismaService, 'PrismaService'],
})
export class DatabaseModule {}
