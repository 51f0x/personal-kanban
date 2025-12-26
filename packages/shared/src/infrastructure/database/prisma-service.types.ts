/**
 * Type-only exports for PrismaService
 * These can be safely imported in worker without loading the API Prisma client
 */

import type { PrismaClient } from '@prisma/client';

/**
 * Type-only interface for PrismaService
 * Use this for type annotations in worker services
 * Runtime injection should use @Inject('PrismaService') with the token
 */
export interface IPrismaService {
  // Core PrismaClient methods
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $on(event: string, callback: (params: unknown) => void): void;
  $transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T>;
  $transaction<T>(
    operations: Array<(prisma: PrismaClient) => Promise<T>>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T[]>;
  $use(middleware: unknown): void;
  $extends: PrismaClient['$extends'];

  // Model accessors - these will be typed based on the actual Prisma client
  [key: string]: unknown;
}

/**
 * Type alias for PrismaService
 * Use this for type annotations instead of importing the class directly
 */
export type PrismaService = IPrismaService;

