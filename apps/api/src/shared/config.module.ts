import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { apiConfigSchema } from '@personal-kanban/shared';

// Resolve root .env paths (works from apps/api directory)
const rootEnvPath = resolve(process.cwd(), '../../.env');
const rootEnvApiPath = resolve(process.cwd(), '../../.env.api');
const rootEnvLocalPath = resolve(process.cwd(), '../../.env.local');

@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [
                '.env.api',
                '.env.local',
                '.env',
                rootEnvApiPath,
                rootEnvLocalPath,
                rootEnvPath,
            ],
            validationSchema: apiConfigSchema,
            validationOptions: {
                abortEarly: false,
                allowUnknown: true,
            },
        }),
    ],
})
export class ConfigModule {}
