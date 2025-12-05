import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { resolve } from 'node:path';

// Resolve root .env paths (works from apps/worker directory)
const rootEnvPath = resolve(process.cwd(), '../../.env');
const rootEnvLocalPath = resolve(process.cwd(), '../../.env.local');

@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.worker', '.env.local', '.env', rootEnvLocalPath, rootEnvPath],
            validationSchema: Joi.object({
                NODE_ENV: Joi.string()
                    .valid('development', 'test', 'production')
                    .default('development'),
                DATABASE_URL: Joi.string().uri().required(),
                REDIS_URL: Joi.string().uri().required(),
                API_URL: Joi.string().uri().default('http://localhost:3000'),
                LLM_ENDPOINT: Joi.string()
                    .uri({ scheme: ['http', 'https'] })
                    .default('http://localhost:11434')
                    .description('Ollama endpoint URL'),
                LLM_MODEL: Joi.string().default('granite4:1b').description('Ollama model to use'),
                LLM_TIMEOUT_MS: Joi.number()
                    .integer()
                    .min(1000)
                    .max(300000)
                    .default(120000)
                    .description('LLM request timeout in milliseconds (1s-5min)'),
                LLM_MAX_RETRIES: Joi.number()
                    .integer()
                    .min(0)
                    .max(5)
                    .default(2)
                    .description('Maximum retry attempts for LLM calls'),
            }),
            validationOptions: {
                abortEarly: false,
            },
        }),
    ],
})
export class ConfigModule {}
