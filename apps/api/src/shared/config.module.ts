import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { resolve } from 'path';

const configValidationSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  // Server
  PORT: Joi.number().default(3000),
  API_HOST: Joi.string().default('0.0.0.0'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  // Database
  DATABASE_URL: Joi.string().required().description('PostgreSQL connection string'),

  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379').description('Redis connection string'),
  REDIS_QUEUE_PREFIX: Joi.string().default('pk'),

  // Security
  CAPTURE_ACCESS_TOKEN: Joi.string().allow('').default('').description('Token for capture endpoint auth'),
  SESSION_SECRET: Joi.string().min(16).default('change-me-in-production'),
  JWT_SECRET: Joi.string().min(16).default('change-me-in-production'),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60).description('Rate limit window in seconds'),
  RATE_LIMIT_MAX: Joi.number().default(100).description('Max requests per window'),
  CAPTURE_RATE_LIMIT_MAX: Joi.number().default(60).description('Max capture requests per window'),

  // IMAP (optional)
  IMAP_HOST: Joi.string().allow('').default(''),
  IMAP_PORT: Joi.number().default(993),
  IMAP_SECURE: Joi.boolean().default(true),
  IMAP_USERNAME: Joi.string().allow('').default(''),
  IMAP_PASSWORD: Joi.string().allow('').default(''),
  IMAP_MAILBOX: Joi.string().default('INBOX'),
  IMAP_POLL_INTERVAL_MS: Joi.number().default(60000),
  IMAP_DEFAULT_BOARD_ID: Joi.string().uuid().allow('').default(''),
  IMAP_DEFAULT_OWNER_ID: Joi.string().uuid().allow('').default(''),
  IMAP_DEFAULT_COLUMN_ID: Joi.string().uuid().allow('').default(''),

  // SMTP (optional)
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USERNAME: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.string().email().default('noreply@localhost'),

  // S3/Object Storage (optional)
  S3_ENDPOINT: Joi.string().allow('').default(''),
  S3_BUCKET: Joi.string().default('kanban-attachments'),
  S3_ACCESS_KEY: Joi.string().allow('').default(''),
  S3_SECRET_KEY: Joi.string().allow('').default(''),

  // LLM (optional)
  LLM_ENDPOINT: Joi.string().default('http://localhost:11434').description('Ollama endpoint URL'),
  LLM_MODEL: Joi.string().default('llama3.2:1b').description('Ollama model to use'),

  // Observability
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().allow('').default(''),
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('pretty'),
});

// Resolve root .env paths (works from apps/api directory)
const rootEnvPath = resolve(process.cwd(), '../../.env');
const rootEnvLocalPath = resolve(process.cwd(), '../../.env.local');

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local',
        '.env',
        rootEnvLocalPath,
        rootEnvPath,
      ],
      validationSchema: configValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
  ],
})
export class ConfigModule {}
