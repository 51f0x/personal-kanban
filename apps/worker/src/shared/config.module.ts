import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { resolve } from 'path';

// Resolve root .env paths (works from apps/worker directory)
const rootEnvPath = resolve(process.cwd(), '../../.env');
const rootEnvLocalPath = resolve(process.cwd(), '../../.env.local');

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.worker',
        '.env.local',
        '.env',
        rootEnvLocalPath,
        rootEnvPath,
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        DATABASE_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),
      }),
      validationOptions: {
        abortEarly: false,
      },
    }),
  ],
})
export class ConfigModule {}
