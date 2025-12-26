import { resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { apiConfigSchema } from "@personal-kanban/shared";

// Resolve env paths (prioritize local .env files)
const localEnvPath = resolve(process.cwd(), ".env");
const localEnvApiPath = resolve(process.cwd(), ".env.api");
const localEnvLocalPath = resolve(process.cwd(), ".env.local");
const rootEnvPath = resolve(process.cwd(), "../../.env");
const rootEnvApiPath = resolve(process.cwd(), "../../.env.api");
const rootEnvLocalPath = resolve(process.cwd(), "../../.env.local");

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        // Local .env files (highest priority)
        localEnvPath,
        localEnvApiPath,
        localEnvLocalPath,
        // Root .env files (fallback)
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
