import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';

/**
 * Shared DatabaseModule
 * Provides PrismaService for both API and Worker containers
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [PrismaService],
    exports: [PrismaService],
})
export class DatabaseModule {}
