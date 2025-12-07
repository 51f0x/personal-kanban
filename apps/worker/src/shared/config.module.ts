import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { workerConfigSchema } from '@personal-kanban/shared';

// Resolve root .env paths (works from apps/worker directory)
const rootEnvPath = resolve(process.cwd(), '../../.env');
const rootEnvWorkerPath = resolve(process.cwd(), '../../.env.worker');
const rootEnvLocalPath = resolve(process.cwd(), '../../.env.local');

@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [
                '.env.worker',
                '.env.local',
                '.env',
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
