# NestJS Review Plan for apps/worker

## Executive Summary

This review plan provides a comprehensive NestJS-focused analysis framework for the worker application. The worker is a NestJS application context that processes background jobs, handles inter-container communication, and manages agent-based task processing.

## Review Scope

### Application Structure
- **Type**: NestJS Application Context (not HTTP server)
- **Entry Point**: `src/main.ts` using `NestFactory.createApplicationContext()`
- **Modules**: 7 feature modules + shared modules
- **Key Technologies**: BullMQ, Redis, Prisma, Ollama

### Modules to Review
1. `WorkerModule` (root module)
2. `AgentsModule` (agent processing with BullMQ)
3. `EventsModule` (global event bus)
4. `InterContainerModule` (inter-container queue communication)
5. `IntegrationsModule` (IMAP polling)
6. `NotificationsModule` (email reminders)
7. `CaptureWorkerModule` (quick task capture)
8. `ConfigModule` (shared configuration)

---

## Review Categories

### 1. Module Architecture & Organization

#### 1.1 Module Structure
- [ ] **Module Imports**: Verify proper module dependency order
- [ ] **Global Modules**: Check if `@Global()` is used appropriately
  - Current: `EventsModule`, `InterContainerModule` are global
  - Review: Are these truly needed globally or can they be imported explicitly?
- [ ] **Module Exports**: Verify all necessary providers are exported
- [ ] **Circular Dependencies**: Check for potential circular import issues

#### 1.2 Feature Module Patterns
- [ ] **Single Responsibility**: Each module should have a clear, single purpose
- [ ] **Module Boundaries**: Verify proper encapsulation of module internals
- [ ] **Shared Dependencies**: Review use of shared modules (DatabaseModule, ConfigModule)

#### Files to Review
- `src/modules/worker.module.ts`
- `src/modules/agents/agents.module.ts`
- `src/modules/events/events.module.ts`
- `src/modules/inter-container/inter-container.module.ts`
- All other module files

---

### 2. Dependency Injection & Providers

#### 2.1 Provider Registration
- [ ] **Injectable Decorators**: All services should have `@Injectable()`
- [ ] **Provider Scope**: Check if singleton scope is appropriate (default)
  - Review: Are there any providers that should be request-scoped or transient?
- [ ] **Factory Providers**: Review factory patterns (e.g., `RedisEventBus`, BullMQ config)
- [ ] **Custom Providers**: Verify proper use of `provide`/`useFactory`/`useClass` patterns

#### 2.2 Constructor Injection
- [ ] **Dependency Injection**: All dependencies injected via constructor
- [ ] **Optional Dependencies**: Verify proper use of `@Optional()` where needed
- [ ] **Injection Tokens**: Check if string tokens are necessary or can use class tokens

#### 2.3 Service Dependencies
- [ ] **Circular Dependencies**: Detect and resolve any circular service dependencies
- [ ] **Forward References**: Check if `forwardRef()` is used correctly (if needed)

#### Files to Review
- All `*.service.ts` files
- All `*.module.ts` files
- `src/modules/events/redis-event-bus.service.ts` (factory provider)
- `src/modules/inter-container/inter-container-queue.service.ts`

---

### 3. Lifecycle Hooks

#### 3.1 Lifecycle Implementation
- [ ] **OnModuleInit**: Verify proper initialization logic
  - Current implementations: `InterContainerQueueService`, `RedisEventBus`, `ImapPollerService`, `EmailReminderWorker`
- [ ] **OnModuleDestroy**: Verify proper cleanup logic
  - Current implementations: `InterContainerQueueService`, `RedisEventBus`, `ImapPollerService`
- [ ] **OnApplicationShutdown**: Check if needed for graceful shutdown
  - Current: Not implemented - review if needed for Redis/BullMQ cleanup
- [ ] **Error Handling**: Lifecycle hooks should handle errors gracefully

#### 3.2 Resource Management
- [ ] **Connection Cleanup**: Redis, BullMQ workers, IMAP connections properly closed
- [ ] **Memory Leaks**: Check for potential memory leaks in lifecycle hooks
- [ ] **Async Initialization**: Verify async operations in `onModuleInit` are awaited

#### Files to Review
- `src/modules/inter-container/inter-container-queue.service.ts` (OnModuleInit, OnModuleDestroy)
- `src/modules/events/redis-event-bus.service.ts` (OnModuleInit, OnModuleDestroy)
- `src/modules/integrations/imap.poller.ts` (OnModuleInit, OnModuleDestroy)
- `src/modules/notifications/email-reminder.worker.ts` (OnModuleInit)
- `src/main.ts` (bootstrap error handling)

---

### 4. Configuration Management

#### 4.1 ConfigModule Setup
- [ ] **Global Configuration**: Verify `ConfigModule` is properly global
- [ ] **Environment Files**: Review env file loading order
- [ ] **Validation Schema**: Verify `workerConfigSchema` validation
- [ ] **Type Safety**: Check if config values are properly typed

#### 4.2 ConfigService Usage
- [ ] **Default Values**: Verify appropriate defaults for all config values
- [ ] **Required vs Optional**: Check if required configs are validated
- [ ] **Config Access**: Review patterns for accessing config values
- [ ] **Type Assertions**: Verify proper type handling for config values

#### Files to Review
- `src/shared/config.module.ts`
- All services using `ConfigService`
- `src/modules/agents/agents.module.ts` (BullMQ config)

---

### 5. BullMQ Integration

#### 5.1 Queue Configuration
- [ ] **Queue Registration**: Verify proper queue registration in `AgentsModule`
- [ ] **Connection Configuration**: Review Redis connection setup
- [ ] **Queue Options**: Check if queue options (concurrency, retry, etc.) are configured
- [ ] **Multiple Queues**: Review use of multiple queues (`agent-processing`, `agent-results`)

#### 5.2 Job Processors
- [ ] **Processor Decorator**: Verify `@Processor()` usage
- [ ] **WorkerHost Extension**: Check if `extends WorkerHost` is correct pattern
- [ ] **Job Processing**: Review error handling in job processors
- [ ] **Job Retry Logic**: Verify retry configuration for failed jobs
- [ ] **Job Timeout**: Check if job timeouts are configured appropriately

#### 5.3 Queue Management
- [ ] **Queue Cleanup**: Verify queues are properly closed on shutdown
- [ ] **Worker Cleanup**: Check if workers are properly closed
- [ ] **Connection Management**: Review Redis connection reuse

#### Files to Review
- `src/modules/agents/agents.module.ts` (BullMQ setup)
- `src/modules/agents/agent-job.processor.ts`
- `src/modules/inter-container/inter-container-queue.service.ts` (custom queue usage)

---

### 6. Error Handling & Logging

#### 6.1 Error Handling Patterns
- [ ] **Try-Catch Blocks**: Verify proper error handling in async operations
- [ ] **Error Propagation**: Check if errors are properly propagated or caught
- [ ] **Error Types**: Review use of custom error classes vs generic Error
- [ ] **Graceful Degradation**: Check if services handle errors gracefully

#### 6.2 Logging
- [ ] **Logger Usage**: Verify consistent use of NestJS Logger
- [ ] **Logger Context**: Check if logger contexts are meaningful
- [ ] **Log Levels**: Review appropriate use of log/warn/error/debug
- [ ] **Structured Logging**: Check if logs include necessary context

#### Files to Review
- All service files for error handling patterns
- `src/main.ts` (bootstrap error handling)
- `src/modules/agents/base-agent.ts` (error logging patterns)

---

### 7. Application Context vs HTTP Server

#### 7.1 Application Context Usage
- [ ] **Correct Pattern**: Verify `createApplicationContext()` is appropriate (not HTTP server)
- [ ] **Bootstrap Logic**: Review bootstrap error handling
- [ ] **Process Management**: Check if process signals are handled
- [ ] **Graceful Shutdown**: Verify graceful shutdown implementation

#### 7.2 Missing Features
- [ ] **Shutdown Hooks**: Review if `app.enableShutdownHooks()` is needed
- [ ] **Health Checks**: Check if health check endpoints are needed (via separate HTTP server?)
- [ ] **Metrics**: Review if metrics collection is needed

#### Files to Review
- `src/main.ts`

---

### 8. TypeScript & Type Safety

#### 8.1 Type Definitions
- [ ] **Interface Usage**: Verify proper use of interfaces vs classes
- [ ] **Type Imports**: Check if `type` imports are used where appropriate
- [ ] **Generic Types**: Review generic type usage
- [ ] **Type Assertions**: Check for unsafe type assertions

#### 8.2 Dependency Types
- [ ] **Injection Types**: Verify proper typing of injected dependencies
- [ ] **Config Types**: Check if config values are properly typed
- [ ] **Return Types**: Review explicit return types on methods

#### Files to Review
- All TypeScript files for type safety
- `src/modules/agents/types.ts`
- `src/shared/schemas/agent-schemas.ts`

---

### 9. Testing Considerations

#### 9.1 Testability
- [ ] **Dependency Injection**: Services should be easily mockable
- [ ] **Module Isolation**: Modules should be testable in isolation
- [ ] **Test Utilities**: Check if test utilities/modules exist

#### 9.2 Test Coverage
- [ ] **Unit Tests**: Review existing unit tests
- [ ] **Integration Tests**: Check for integration test coverage
- [ ] **E2E Tests**: Review end-to-end test setup

#### Files to Review
- `jest.config.ts`
- `src/modules/integrations/__tests__/imap.poller.spec.ts`
- Check for other test files

---

### 10. Performance & Resource Management

#### 10.1 Resource Usage
- [ ] **Connection Pooling**: Review Redis connection pooling
- [ ] **Database Connections**: Check Prisma connection management
- [ ] **Memory Usage**: Review potential memory leaks
- [ ] **Async Operations**: Verify proper async/await usage

#### 10.2 Concurrency
- [ ] **Queue Concurrency**: Review BullMQ worker concurrency settings
- [ ] **Parallel Processing**: Check if parallel operations are properly handled
- [ ] **Race Conditions**: Review potential race conditions

#### Files to Review
- `src/modules/inter-container/inter-container-queue.service.ts` (connection management)
- `src/modules/events/redis-event-bus.service.ts` (Redis usage)
- `src/modules/agents/agents.module.ts` (BullMQ concurrency)

---

### 11. Security Review

#### 11.1 Configuration Security
- [ ] **Secrets Management**: Verify no hardcoded secrets
- [ ] **Environment Variables**: Check if sensitive data is in env vars
- [ ] **Config Validation**: Verify validation prevents invalid configs

#### 11.2 Input Validation
- [ ] **Job Data Validation**: Review validation of BullMQ job data
- [ ] **Event Validation**: Check validation of domain events
- [ ] **API Request Validation**: Review inter-container request validation

#### Files to Review
- All config usage
- `src/modules/agents/agent-job.processor.ts` (job data validation)
- `src/modules/inter-container/inter-container-queue.service.ts` (request validation)

---

### 12. Code Quality & Best Practices

#### 12.1 NestJS Conventions
- [ ] **Naming Conventions**: Verify file and class naming follows NestJS conventions
- [ ] **File Organization**: Check if files are organized by feature
- [ ] **Decorator Usage**: Review proper use of NestJS decorators

#### 12.2 Code Structure
- [ ] **Service Responsibilities**: Verify single responsibility principle
- [ ] **Code Duplication**: Check for duplicated code
- [ ] **Complexity**: Review complex methods that should be refactored

#### 12.3 Documentation
- [ ] **JSDoc Comments**: Check for adequate documentation
- [ ] **README**: Verify README exists and is up-to-date
- [ ] **Inline Comments**: Review if complex logic is documented

---

## Review Execution Plan

### Phase 1: Architecture & Module Structure (Priority: High)
1. Review all module files for proper structure
2. Check module dependencies and imports
3. Verify global module usage
4. Review provider registration

### Phase 2: Lifecycle & Resource Management (Priority: High)
1. Review all lifecycle hook implementations
2. Check resource cleanup (Redis, BullMQ, IMAP)
3. Verify graceful shutdown handling
4. Review error handling in lifecycle hooks

### Phase 3: Configuration & Dependency Injection (Priority: Medium)
1. Review ConfigModule setup and usage
2. Check dependency injection patterns
3. Verify factory providers
4. Review type safety

### Phase 4: BullMQ & Queue Management (Priority: High)
1. Review BullMQ configuration
2. Check job processor implementation
3. Verify queue cleanup
4. Review error handling in jobs

### Phase 5: Code Quality & Best Practices (Priority: Medium)
1. Review error handling patterns
2. Check logging consistency
3. Review TypeScript usage
4. Check documentation

### Phase 6: Security & Performance (Priority: Medium)
1. Security review (secrets, validation)
2. Performance review (connections, concurrency)
3. Resource management review

---

## Expected Findings Categories

### Critical Issues (Must Fix)
- Resource leaks (unclosed connections)
- Missing error handling in critical paths
- Security vulnerabilities
- Incorrect lifecycle hook usage

### Important Issues (Should Fix)
- Missing graceful shutdown
- Improper module organization
- Type safety issues
- Configuration validation gaps

### Nice-to-Have (Consider)
- Code organization improvements
- Documentation enhancements
- Performance optimizations
- Test coverage improvements

---

## Review Tools & Commands

### Static Analysis
```bash
# Lint check
pnpm --filter @personal-kanban/worker lint

# Type checking
pnpm --filter @personal-kanban/worker build
```

### Dependency Analysis
```bash
# Check for circular dependencies
npx madge --circular apps/worker/src
```

### Test Execution
```bash
# Run tests
pnpm --filter @personal-kanban/worker test
```

---

## Review Output Format

For each finding, document:
1. **Category**: Module/DI/Lifecycle/etc.
2. **Severity**: Critical/Important/Consider
3. **File**: File path and line numbers
4. **Issue**: Clear description of the issue
5. **Recommendation**: Specific fix or improvement
6. **Code Example**: Before/after code if applicable

---

## Notes

- This is a worker application (not HTTP server), so patterns differ from typical NestJS apps
- Heavy use of BullMQ for job processing
- Inter-container communication via Redis queues
- Global modules used for shared infrastructure (Events, InterContainer)
- Application context pattern (no HTTP endpoints)

