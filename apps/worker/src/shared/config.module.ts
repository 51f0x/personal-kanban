import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
// Import directly from config file to avoid loading database exports (which include PrismaService)
// Use require to avoid loading the entire shared package index
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { workerConfigSchema } = require('@personal-kanban/shared/dist/infrastructure/config/base-config.schema');

// Resolve env paths (prioritize local .env files)
const localEnvPath = resolve(process.cwd(), '.env');
const localEnvWorkerPath = resolve(process.cwd(), '.env.worker');
const localEnvLocalPath = resolve(process.cwd(), '.env.local');
const rootEnvPath = resolve(process.cwd(), '../../.env');
const rootEnvWorkerPath = resolve(process.cwd(), '../../.env.worker');
const rootEnvLocalPath = resolve(process.cwd(), '../../.env.local');

@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [
                // Local .env files (highest priority)
                localEnvPath,
                localEnvWorkerPath,
                localEnvLocalPath,
                // Root .env files (fallback)
                rootEnvWorkerPath,
                rootEnvLocalPath,
                rootEnvPath,
            ],
            validationSchema: workerConfigSchema,
            validationOptions: {
                abortEarly: false,
            },
        }),
    ],
})
export class ConfigModule {}
