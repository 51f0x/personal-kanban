/**
 * Prisma Client Resolver
 * Resolves the correct Prisma client at runtime based on the app context
 * This avoids module-load-time issues with relative paths
 */

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * Get current file directory (works in CommonJS)
 * Note: This package uses CommonJS, so __filename is always available
 */
function getCurrentDir(): string {
    // CommonJS - __filename is always available in compiled output
    if (typeof __filename !== 'undefined') {
        return dirname(__filename);
    }
    // Fallback to process.cwd() (shouldn't happen in CommonJS)
    return process.cwd();
}

/**
 * Find the workspace root by looking for pnpm-workspace.yaml or package.json
 */
function findWorkspaceRoot(startPath: string): string | null {
    let current = startPath;
    const root = resolve('/');
    
    while (current !== root) {
        if (
            existsSync(resolve(current, 'pnpm-workspace.yaml')) ||
            (existsSync(resolve(current, 'package.json')) &&
             existsSync(resolve(current, 'node_modules/.prisma')))
        ) {
            return current;
        }
        current = resolve(current, '..');
    }
    
    return null;
}

/**
 * Resolve API Prisma client path
 */
export function resolveApiPrismaClient(): typeof import('@prisma/client').PrismaClient {
    // Get the current file's directory (works in both source and compiled)
    const currentDir = getCurrentDir();
    
    // Try multiple resolution strategies
    const strategies = [
        // Strategy 1: From shared package location (development)
        () => resolve(currentDir, '../../../node_modules/.prisma/client-api'),
        // Strategy 2: From workspace root (most common)
        () => {
            const workspaceRoot = findWorkspaceRoot(currentDir);
            return workspaceRoot ? resolve(workspaceRoot, 'node_modules/.prisma/client-api') : null;
        },
        // Strategy 3: From process.cwd() (runtime)
        () => resolve(process.cwd(), '../../node_modules/.prisma/client-api'),
        // Strategy 4: From process.cwd() directly
        () => resolve(process.cwd(), 'node_modules/.prisma/client-api'),
        // Strategy 5: Try to resolve via require.resolve
        () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                return require.resolve('.prisma/client-api');
            } catch {
                return null;
            }
        },
    ];
    
    for (const strategy of strategies) {
        try {
            const path = strategy();
            if (path && existsSync(path)) {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const client = require(path);
                if (client.PrismaClient) {
                    return client.PrismaClient;
                }
            }
        } catch {
            // Continue to next strategy
        }
    }
    
    throw new Error(
        'Could not resolve API Prisma client. ' +
        'Make sure @personal-kanban/api has generated its Prisma client with: pnpm --filter @personal-kanban/api db:generate'
    );
}

/**
 * Resolve Worker Prisma client path
 */
export function resolveWorkerPrismaClient(): typeof import('@prisma/client').PrismaClient {
    // Get the current file's directory (works in both source and compiled)
    const currentDir = getCurrentDir();
    
    // Try multiple resolution strategies
    const strategies = [
        // Strategy 1: From shared package location (development)
        () => resolve(currentDir, '../../../node_modules/.prisma/client-worker'),
        // Strategy 2: From workspace root (most common)
        () => {
            const workspaceRoot = findWorkspaceRoot(currentDir);
            return workspaceRoot ? resolve(workspaceRoot, 'node_modules/.prisma/client-worker') : null;
        },
        // Strategy 3: From process.cwd() (runtime)
        () => resolve(process.cwd(), '../../node_modules/.prisma/client-worker'),
        // Strategy 4: From process.cwd() directly
        () => resolve(process.cwd(), 'node_modules/.prisma/client-worker'),
        // Strategy 5: Try to resolve via require.resolve
        () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                return require.resolve('.prisma/client-worker');
            } catch {
                return null;
            }
        },
    ];
    
    for (const strategy of strategies) {
        try {
            const path = strategy();
            if (path && existsSync(path)) {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const client = require(path);
                if (client.PrismaClient) {
                    return client.PrismaClient;
                }
            }
        } catch {
            // Continue to next strategy
        }
    }
    
    throw new Error(
        'Could not resolve Worker Prisma client. ' +
        'Make sure @personal-kanban/worker has generated its Prisma client with: pnpm --filter @personal-kanban/worker db:generate'
    );
}

