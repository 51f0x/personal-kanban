import { Global, Module } from "@nestjs/common";
// Import directly from the file to avoid loading the entire shared package index
// which would load PrismaService (API client) that the worker doesn't have
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  WorkerPrismaService,
} = require("@personal-kanban/shared/dist/infrastructure/database/worker-prisma.service");

// Create a string token that matches what services expect
// Services import PrismaService as a type from @personal-kanban/shared
// but we provide it using this string token to avoid loading the API Prisma client
const PRISMA_SERVICE_TOKEN = "PrismaService";

/**
 * Worker-specific DatabaseModule
 * Uses WORKER_DATABASE_URL for database connections
 * Exports as PrismaService for compatibility with existing code
 * Note: ConfigModule is already global, so ConfigService is available without importing
 *
 * IMPORTANT: Services must use @Inject('PrismaService') instead of injecting PrismaService directly
 * to avoid loading the API Prisma client
 */
@Global()
@Module({
  providers: [
    WorkerPrismaService,
    {
      provide: PRISMA_SERVICE_TOKEN,
      useExisting: WorkerPrismaService,
    },
  ],
  exports: [WorkerPrismaService, PRISMA_SERVICE_TOKEN],
})
export class WorkerDatabaseModule {}
