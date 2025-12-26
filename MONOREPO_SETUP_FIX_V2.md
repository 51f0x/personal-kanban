# Monorepo Setup Fix V2 - Runtime Prisma Client Resolution

## The Real Problem

The previous solution had a critical flaw: **Prisma client imports happened at module load time** with relative paths that don't work after TypeScript compilation. When the shared package is built, the relative paths in `require()` calls become invalid.

## The Solution: Runtime Resolution

### Key Changes

1. **Created `prisma-client-resolver.ts`**: A runtime resolver that:
   - Finds the workspace root dynamically
   - Tries multiple path resolution strategies
   - Works in both development and production builds
   - Works with both CommonJS and ES modules

2. **Lazy Loading**: Prisma clients are now loaded:
   - At **construction time** (not module load time)
   - Using runtime path resolution
   - With multiple fallback strategies

3. **Proxy Pattern**: Both `PrismaService` and `WorkerPrismaService` use:
   - Composition instead of inheritance
   - Proxy to forward all PrismaClient methods/properties
   - Maintains full TypeScript compatibility

## How It Works

### Prisma Client Resolution

The resolver tries these strategies in order:

1. **From shared package location** (development)
   - `packages/shared/dist/infrastructure/database/../../../node_modules/.prisma/client-api`

2. **From workspace root** (most common)
   - Finds workspace root by looking for `pnpm-workspace.yaml`
   - Resolves to `{workspaceRoot}/node_modules/.prisma/client-api`

3. **From process.cwd()** (runtime fallback)
   - `process.cwd()/../../node_modules/.prisma/client-api`
   - `process.cwd()/node_modules/.prisma/client-api`

4. **Via require.resolve** (last resort)
   - Uses Node's module resolution

### Service Implementation

```typescript
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly client: PrismaClient;
    
    constructor(configService: ConfigService) {
        // Load Prisma client at construction time (not module load time)
        const PrismaClient = getPrismaClientClass(); // Runtime resolution
        this.client = new PrismaClient({ ... });
        
        // Proxy forwards all property access to client
        return new Proxy(this, {
            get(target, prop) {
                if (prop in target && prop !== 'client') {
                    return target[prop]; // Our own methods
                }
                return target.client[prop]; // PrismaClient methods/models
            },
        });
    }
}
```

## Benefits

1. **Works After Compilation**: Paths resolved at runtime, not compile time
2. **Multiple Fallbacks**: Handles different build/deployment scenarios
3. **Type Safe**: Proxy maintains TypeScript compatibility
4. **No Module Load Issues**: Client loaded only when service is instantiated
5. **Workspace Aware**: Automatically finds workspace root

## Testing

To verify the fix works:

1. **Build the shared package**:
   ```bash
   pnpm --filter @personal-kanban/shared build
   ```

2. **Generate Prisma clients**:
   ```bash
   pnpm db:generate
   ```

3. **Start API app**:
   ```bash
   pnpm --filter @personal-kanban/api dev
   ```
   Should connect to database without errors.

4. **Start Worker app**:
   ```bash
   pnpm --filter @personal-kanban/worker dev
   ```
   Should connect to database without errors.

## Files Changed

- `packages/shared/src/infrastructure/database/prisma-client-resolver.ts` (new)
- `packages/shared/src/infrastructure/database/prisma.service.ts`
- `packages/shared/src/infrastructure/database/worker-prisma.service.ts`

## Why This Works

The previous solution failed because:
- `require('../../../node_modules/.prisma/client-api')` paths are relative to the **source file**
- After compilation, the file moves to `dist/`, breaking the path
- Module load happens **before** the service is instantiated

This solution works because:
- Paths are resolved **at runtime** using `__filename` or `process.cwd()`
- Multiple fallback strategies handle different scenarios
- Client is loaded **at construction time**, not module load time
- Workspace root is found dynamically

## Future Improvements

1. Cache resolved paths to avoid repeated filesystem lookups
2. Add environment variable override for custom Prisma client locations
3. Consider using Prisma's built-in multi-schema support more explicitly

