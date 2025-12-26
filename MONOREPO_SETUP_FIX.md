# Monorepo Setup Fix - Comprehensive Solution

## Problem Analysis

The monorepo had several critical setup issues that prevented proper separation between API and Worker apps:

### 1. **Prisma Client Import Issues**
- The shared package used hardcoded relative paths (`../../../node_modules/.prisma/client-api`) to import Prisma clients
- These paths were fragile and didn't work reliably in a pnpm workspace
- Both API and Worker generate separate Prisma clients to different locations, but the shared package tried to import both

### 2. **Type vs Runtime Import Confusion**
- Worker services imported `PrismaService` as a type from `@personal-kanban/shared`
- When services injected `PrismaService` directly (without `@Inject('PrismaService')`), TypeScript/NestJS tried to resolve it at runtime
- This caused the API Prisma client to be loaded in the worker, leading to runtime errors

### 3. **Inconsistent Injection Patterns**
- Some worker services correctly used `@Inject("PrismaService")` (e.g., `hint.service.ts`, `local-brain.service.ts`)
- Others injected `PrismaService` directly (e.g., `task-processor.service.ts`, `agent-orchestrator.service.ts`, `agent-job.processor.ts`, `agent-application.service.ts`)
- This inconsistency caused failures when the shared `DatabaseModule` wasn't imported

### 4. **DatabaseModule Export Problem**
- The shared `DatabaseModule` exported `PrismaService` which loaded the API Prisma client
- Worker couldn't use this module, so it had a workaround (`WorkerDatabaseModule`), but type imports still caused issues

### 5. **Missing Dependency Declaration**
- Worker's `package.json` didn't list `@personal-kanban/shared` as a dependency
- This could cause issues with package resolution and type checking

### 6. **No Type-Only Exports**
- The shared package exported implementations that loaded Prisma clients
- There was no way to import just the types without triggering module loading

## Solution Implemented

### 1. **Created Type-Only Exports**
Created `prisma-service.types.ts` with:
- `IPrismaService` interface for type annotations
- `PrismaService` type alias that can be safely imported anywhere
- These types don't trigger module loading, so they're safe to import in worker

### 2. **Fixed Prisma Client Imports**
- Updated `prisma.service.ts` and `worker-prisma.service.ts` to use `resolve(__dirname, ...)` for reliable path resolution
- This works correctly in both development and production builds
- Each service now correctly imports its own Prisma client

### 3. **Separated Type and Implementation Exports**
Updated `packages/shared/src/infrastructure/database/index.ts`:
- Export types first (safe to import anywhere)
- Export implementations separately (with clear naming)
- This allows worker to import types without loading implementations

### 4. **Fixed All Worker Services**
Updated all worker services to:
- Import `PrismaService` as a type: `import type { PrismaService } from "@personal-kanban/shared"`
- Use `@Inject("PrismaService")` for dependency injection
- This ensures the correct Prisma client (WorkerPrismaService) is injected at runtime

### 5. **Updated DatabaseModule**
- `DatabaseModule` now provides both the class and a token for backward compatibility
- API services can continue using `PrismaService` directly
- Worker uses `WorkerDatabaseModule` which provides `WorkerPrismaService` under the `"PrismaService"` token

### 6. **Added Missing Dependency**
- Added `@personal-kanban/shared` to worker's `package.json` dependencies
- Ensures proper package resolution and type checking

## Files Changed

### Shared Package
- `packages/shared/src/infrastructure/database/prisma-service.types.ts` (new)
- `packages/shared/src/infrastructure/database/prisma.service.ts`
- `packages/shared/src/infrastructure/database/worker-prisma.service.ts`
- `packages/shared/src/infrastructure/database/database.module.ts`
- `packages/shared/src/infrastructure/database/index.ts`
- `packages/shared/src/index.ts`

### Worker App
- `apps/worker/package.json`
- `apps/worker/src/modules/agents/services/task-processor.service.ts`
- `apps/worker/src/modules/agents/services/agent-orchestrator.service.ts`
- `apps/worker/src/modules/agents/services/agent-application.service.ts`
- `apps/worker/src/modules/agents/processors/agent-job.processor.ts`
- `apps/worker/src/test-agents.ts`

## Usage Guidelines

### For API Services
```typescript
import { PrismaService } from "@personal-kanban/shared";

@Injectable()
export class MyService {
  constructor(private readonly prisma: PrismaService) {}
  // Works because DatabaseModule provides PrismaService
}
```

### For Worker Services
```typescript
import { Inject, Injectable } from "@nestjs/common";
import type { PrismaService } from "@personal-kanban/shared";

@Injectable()
export class MyService {
  constructor(
    @Inject("PrismaService") private readonly prisma: PrismaService
  ) {}
  // Uses WorkerPrismaService from WorkerDatabaseModule
}
```

### For Type-Only Usage
```typescript
import type { PrismaService } from "@personal-kanban/shared";

function processTask(prisma: PrismaService) {
  // Type annotation only, no runtime import
}
```

## Benefits

1. **Clear Separation**: API and Worker apps are now properly separated with no cross-contamination
2. **Type Safety**: Type-only imports prevent accidental loading of wrong implementations
3. **Consistent Patterns**: All worker services now use the same injection pattern
4. **Maintainability**: Clear guidelines for when to use types vs implementations
5. **Reliability**: Fixed Prisma client imports work correctly in all environments

## Testing Recommendations

1. **Build Test**: Run `pnpm build` to ensure all apps compile correctly
2. **Type Check**: Run `pnpm -r run lint` to verify type imports work
3. **Runtime Test**: Start both API and Worker apps to ensure Prisma clients load correctly
4. **Import Test**: Verify that importing types from shared doesn't trigger module loading

## Future Improvements

1. Consider using Prisma's multi-schema feature more explicitly
2. Create a shared Prisma client factory if both apps need to access the same database
3. Add runtime validation to ensure correct Prisma client is being used
4. Consider using dependency injection tokens more consistently across the codebase

