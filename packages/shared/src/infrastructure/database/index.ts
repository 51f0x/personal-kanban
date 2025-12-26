// Export types first (safe to import anywhere)
export type { IPrismaService, PrismaService as IPrismaServiceType } from './prisma-service.types';

// Export implementations (these may load Prisma clients, so be careful)
// Export PrismaService as the main API implementation (for backward compatibility)
export { PrismaService } from './prisma.service';
export { PrismaService as ApiPrismaService } from './prisma.service';
export { ApiPrismaService as ApiPrismaServiceImpl } from './api-prisma.service';
export { WorkerPrismaService } from './worker-prisma.service';
export { DatabaseModule } from './database.module';
