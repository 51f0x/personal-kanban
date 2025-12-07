# Container and Module Architecture Analysis

## Executive Summary

This document analyzes the module organization across Docker containers (API, Worker, Web) and evaluates SOLID principle compliance at the container and module boundaries level. The analysis reveals significant module duplication, unclear boundaries, and violations of separation of concerns at the container level.

## Table of Contents

1. [Current Container Structure](#current-container-structure)
2. [Module Duplication Analysis](#module-duplication-analysis)
3. [Container-Level SOLID Violations](#container-level-solid-violations)
4. [Module Boundary Issues](#module-boundary-issues)
5. [Recommended Container Architecture](#recommended-container-architecture)
6. [Migration Strategy](#migration-strategy)

---

## Current Container Structure

### Docker Containers Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │   API       │  │   Worker     │  │    Web      │    │
│  │  (19 mods)  │  │   (6 mods)   │  │ (static)    │    │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘    │
│         │                 │                  │           │
│         └─────────────────┴──────────────────┘           │
│                    │          │                          │
│         ┌──────────▼──────────▼──────────┐              │
│         │      Postgres (shared DB)       │              │
│         └─────────────────────────────────┘              │
│                    │                                      │
│         ┌──────────▼──────────┐                          │
│         │  Redis (shared)     │                          │
│         └─────────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

### API Container Modules

```
API Container (apps/api/src/modules/)
├── AnalyticsModule
├── AuthModule
├── AgentsModule (queue, progress)
├── BoardModule
├── CaptureModule (HTTP endpoints)
├── ClarificationModule
├── DatabaseModule (duplicated)
├── EmailActionsModule
├── LlmModule
├── ProjectModule
├── RateLimitModule
├── RealtimeModule (WebSocket)
├── RuleModule
├── TagModule
├── TaskModule
├── TemplateModule
└── ConfigModule (duplicated)
```

### Worker Container Modules

```
Worker Container (apps/worker/src/modules/)
├── AgentsModule (orchestrator, processors)
├── CaptureModule (quick task creation)
├── DatabaseModule (duplicated)
├── IntegrationsModule (IMAP)
├── NotificationsModule
└── ConfigModule (duplicated)
```

### Web Container

```
Web Container (apps/web/)
└── Static React application
    └── No modules (just build artifacts)
```

---

## Module Duplication Analysis

### 🔴 Critical Violations

#### 1. **Shared Database - MAJOR SOLID VIOLATION**

**Current State:**
```yaml
# docker-compose.yml
api:
  DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban

worker:
  DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban  # ❌ SAME DATABASE
```

**Problem:**
- **Both containers access the SAME database**
- **Violates Single Responsibility Principle** at container level
- Creates a **distributed monolith** (not microservices)
- No data ownership boundaries
- Cannot scale or deploy independently
- Schema changes affect both containers
- Transaction boundaries unclear

**Impact:** CRITICAL - Violates SRP, creates tight coupling, prevents independent scaling/deployment

**Solution:** Separate databases - API owns domain data, Worker owns processing data only

**See:** [DATABASE_SEPARATION_ANALYSIS.md](./DATABASE_SEPARATION_ANALYSIS.md) for detailed analysis

---

#### 2. **DatabaseModule Duplication**

**Current State:**
```typescript
// apps/api/src/modules/database/database.module.ts
@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

// apps/worker/src/modules/database/database.module.ts
@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

**Problem:**
- Identical modules in both containers
- Same PrismaService implementation duplicated
- Violates DRY (Don't Repeat Yourself)
- Hard to maintain consistency
- Changes need to be applied in multiple places
- **Worse: Both connect to same database (see #1)**

**Impact:** Maintenance burden, potential inconsistencies, violates DRY principle, enables shared database anti-pattern

---

#### 2. **ConfigModule Duplication**

**Current State:**
```typescript
// apps/api/src/shared/config.module.ts (88 lines)
// Validation schema for API-specific config

// apps/worker/src/shared/config.module.ts (57 lines)
// Validation schema for Worker-specific config
```

**Problem:**
- Similar structure but different validation schemas
- Some shared config, some container-specific
- No clear separation of concerns
- Hard to see what's shared vs. container-specific

**Impact:** Confusion about which config belongs where, potential inconsistencies

---

#### 3. **CaptureModule Duplication**

**Current State:**
```typescript
// API: apps/api/src/modules/capture/
// - HTTP endpoints for capture
// - AgentCaptureService (queues jobs)
// - EmailCaptureService

// Worker: apps/worker/src/modules/capture/
// - QuickTaskService (creates tasks from jobs)
```

**Problem:**
- Different purposes but same name
- Creates confusion
- Unclear boundaries
- API depends on Worker, Worker depends on API (circular dependency risk)

**Impact:** Confusing naming, unclear responsibilities

---

#### 4. **AgentsModule Split**

**Current State:**
```typescript
// API: apps/api/src/modules/agents/
// - AgentQueueService (queues jobs)
// - AgentProgressService (broadcasts via WebSocket)
// - AgentProgressController (receives HTTP callbacks)

// Worker: apps/worker/src/modules/agents/
// - AgentOrchestrator (coordinates agents)
// - TaskProcessorService
// - All agent implementations
```

**Problem:**
- Same domain concept split across containers
- Tight coupling via HTTP callbacks
- Progress reporting crosses container boundaries
- Hard to reason about agent processing flow

**Impact:** Tight coupling, complex orchestration, hard to understand

---

#### 5. **Utility Duplication**

**Current State:**
- `retry.util.ts` - duplicated in API and Worker
- `timeout.util.ts` - duplicated in API and Worker
- `json-parser.util.ts` - duplicated in API and Worker

**Problem:**
- Common utilities should be shared
- Violates DRY principle
- Changes need to be applied in multiple places

**Impact:** Maintenance burden, potential inconsistencies

---

## Container-Level SOLID Violations

### ❌ **S - Single Responsibility Principle**

**Violation:** Containers have mixed responsibilities

**API Container:**
- ✅ HTTP API endpoints
- ✅ WebSocket server
- ❌ Business logic (TaskService, BoardService)
- ❌ Job queuing (AgentQueueService)
- ❌ Progress broadcasting
- ❌ Database access

**Worker Container:**
- ✅ Background job processing
- ❌ Business logic (task creation)
- ❌ Database access
- ❌ HTTP callbacks to API

**Problem:**
- Containers should have single, clear responsibilities
- Current separation is by deployment, not by domain
- Business logic scattered across containers

**Impact:** Hard to scale independently, unclear boundaries, mixed concerns

---

### ❌ **O - Open/Closed Principle**

**Violation:** Adding new containers requires modifying existing ones

**Current State:**
- To add a new worker container, you need to:
  - Modify API to queue jobs differently
  - Understand existing container dependencies
  - Share database connections

**Problem:**
- Containers are tightly coupled
- Cannot add new containers without understanding all existing ones
- Changes ripple across containers

**Impact:** Hard to extend, violates OCP

---

### ❌ **I - Interface Segregation Principle**

**Violation:** No clear contracts between containers

**Current State:**
- API and Worker communicate via:
  - Shared database (direct access)
  - BullMQ queues (job data)
  - HTTP callbacks (progress)
  - No service contracts/interfaces

**Problem:**
- No clear API contracts
- Containers depend on internal structures
- Changes in one container can break another
- No versioning of interfaces

**Impact:** Tight coupling, brittle integration, hard to evolve

---

### ❌ **D - Dependency Inversion Principle**

**Violation:** Containers depend on concrete implementations

**Current State:**
```
API Container
  ↓ (depends on)
Shared Database (Postgres)
  ↑ (depends on)
Worker Container
```

**Problem:**
- Both containers depend on shared database
- No abstraction layer
- Cannot swap database implementation
- Database schema changes affect both containers

**Impact:** Tight coupling, hard to test, cannot swap implementations

---

### ❌ **D - Additional Violation: Shared Database**

**Current State:**
```yaml
# docker-compose.yml
api:
  environment:
    DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban

worker:
  environment:
    DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban
```

**Problem:**
- Both containers share same database
- Direct database access from multiple containers
- No service boundaries
- Database becomes coupling point
- Violates microservices principles

**Impact:** Distributed monolith, cannot scale independently, shared database bottleneck

---

## Module Boundary Issues

### 1. **Unclear Module Boundaries**

**Problem:**
- Modules split across containers without clear rationale
- Some modules in both containers (Capture, Agents)
- No clear ownership

**Example:**
```
CaptureModule
  ├── API: HTTP endpoints, email webhooks
  └── Worker: Task creation from jobs

AgentsModule
  ├── API: Job queuing, progress broadcasting
  └── Worker: Agent orchestration, processing
```

**Impact:** Confusion, unclear responsibilities, hard to maintain

---

### 2. **Cross-Container Dependencies**

**Problem:**
- API depends on Worker (queues jobs)
- Worker depends on API (HTTP callbacks)
- Circular dependency risk
- Tight coupling

**Example:**
```typescript
// API queues job for Worker
await this.agentQueueService.queueAgentProcessing(...);

// Worker calls back to API
await fetch(`${this.apiBaseUrl}/api/v1/agents/progress/update`, ...);
```

**Impact:** Cannot deploy independently, tight coupling, complex coordination

---

### 3. **No Shared Domain Layer**

**Problem:**
- Domain logic duplicated or split across containers
- No shared domain package
- Business rules scattered

**Current:**
- Domain logic in API services
- Domain logic in Worker services
- No clear domain layer

**Impact:** Inconsistencies, duplicate logic, hard to maintain business rules

---

### 4. **Infrastructure Leakage**

**Problem:**
- PrismaService in both containers
- Database access directly in business logic
- Infrastructure concerns mixed with domain

**Impact:** Violates Clean Architecture, hard to test, cannot swap implementations

---

## Recommended Container Architecture

### Container Responsibility Matrix

| Container | Primary Responsibility | Should Contain | Should NOT Contain |
|-----------|----------------------|----------------|-------------------|
| **API** | HTTP/WebSocket interface | Controllers, DTOs, Validation, Auth, Rate Limiting | Business logic, Database access, Job processing |
| **Worker** | Background processing | Job processors, Orchestrators, Background tasks | HTTP endpoints, WebSocket, Business logic |
| **Shared Package** | Domain & Infrastructure | Domain entities, Repositories (interfaces), Shared types, Utilities | Container-specific code |

---

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Shared Package                          │
│  (packages/shared)                                       │
├─────────────────────────────────────────────────────────┤
│  • Domain Entities                                       │
│  • Repository Interfaces                                 │
│  • Domain Events                                         │
│  • Value Objects                                         │
│  • Shared Types                                          │
│  • Utilities                                             │
└─────────────────────────────────────────────────────────┘
                    ↑            ↑
                    │            │
    ┌───────────────┘            └───────────────┐
    │                                             │
┌───▼──────────────────────┐  ┌──────────────────▼───────┐
│   API Container          │  │   Worker Container        │
│   (apps/api)             │  │   (apps/worker)           │
├──────────────────────────┤  ├───────────────────────────┤
│ • HTTP Controllers       │  │ • Job Processors          │
│ • WebSocket Gateway      │  │ • Agent Orchestrator      │
│ • DTOs/Validation        │  │ • Background Services     │
│ • Use Cases              │  │ • Event Handlers          │
│ • Repository Impl        │  │ • Repository Impl         │
│   (infrastructure)       │  │   (infrastructure)        │
│                          │  │                           │
│ ┌──────────────────────┐ │  │ ┌──────────────────────┐ │
│ │ Event Bus (Client)   │ │  │ │ Event Bus (Client)   │ │
│ │ Queue (Producer)     │ │  │ │ Queue (Consumer)     │ │
│ └──────────────────────┘ │  │ └──────────────────────┘ │
└──────────────────────────┘  └───────────────────────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
          ┌───────────────▼───────────────┐
          │   Event Bus (Redis/NATS)      │
          │   Message Queue (BullMQ)      │
          └───────────────────────────────┘
                          │
          ┌───────────────▼───────────────┐
          │   Database (per-container)    │
          │   or Shared with API Gateway  │
          └───────────────────────────────┘
```

---

### Container Separation Strategy

#### 1. **API Container - Presentation & Application Layer**

**Should Contain:**
- HTTP controllers
- WebSocket gateway
- DTOs and validation
- Use cases (application services)
- Repository implementations (infrastructure)
- Event bus client (publisher)
- Queue producer

**Should NOT Contain:**
- Business logic (move to shared domain)
- Job processors
- Background tasks
- Direct database access (use repositories)

---

#### 2. **Worker Container - Background Processing**

**Should Contain:**
- Job processors
- Orchestrators
- Event handlers (consumers)
- Repository implementations (infrastructure)
- Event bus client (subscriber)
- Queue consumer

**Should NOT Contain:**
- HTTP endpoints
- WebSocket
- Business logic (move to shared domain)
- Direct database access (use repositories)

---

#### 3. **Shared Package - Domain & Infrastructure Interfaces**

**Should Contain:**
- Domain entities
- Value objects
- Domain events
- Repository interfaces
- Domain services (interfaces)
- Shared types
- Utilities

**Should NOT Contain:**
- Container-specific code
- Infrastructure implementations
- Framework-specific code

---

## Detailed Recommendations

### 1. Create Shared Domain Package

**Structure:**
```
packages/
├── shared/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── task.entity.ts
│   │   │   ├── board.entity.ts
│   │   │   └── ...
│   │   ├── value-objects/
│   │   │   ├── task-id.vo.ts
│   │   │   └── ...
│   │   ├── events/
│   │   │   ├── task-created.event.ts
│   │   │   └── ...
│   │   └── services/
│   │       └── interfaces/
│   ├── repositories/
│   │   ├── task.repository.interface.ts
│   │   └── ...
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── retry.util.ts
│       └── ...
```

---

### 2. Remove Module Duplications

#### Move DatabaseModule to Shared Package

**Before:**
```
apps/api/src/modules/database/
apps/worker/src/modules/database/
```

**After:**
```
packages/shared/infrastructure/database/
  ├── database.module.ts (interface/abstract)
  └── prisma/
      └── prisma.service.ts (implementation)

apps/api/src/infrastructure/database/
  └── database.module.ts (registers PrismaService)

apps/worker/src/infrastructure/database/
  └── database.module.ts (registers PrismaService)
```

---

#### Move ConfigModule to Shared Package

**Before:**
```
apps/api/src/shared/config.module.ts
apps/worker/src/shared/config.module.ts
```

**After:**
```
packages/shared/config/
  ├── config.module.ts (base)
  ├── api-config.schema.ts
  └── worker-config.schema.ts

apps/api/src/config/
  └── config.module.ts (extends shared with API schema)

apps/worker/src/config/
  └── config.module.ts (extends shared with Worker schema)
```

---

#### Consolidate Utilities

**Before:**
```
apps/api/src/shared/utils/retry.util.ts
apps/worker/src/shared/utils/retry.util.ts
```

**After:**
```
packages/shared/utils/
  ├── retry.util.ts
  ├── timeout.util.ts
  └── json-parser.util.ts
```

---

### 3. Clarify Module Boundaries

#### Rename Conflicting Modules

**Capture Module:**
```
API: apps/api/src/modules/capture/
  → Rename to: apps/api/src/modules/capture-api/
  → Responsibility: HTTP endpoints, webhooks

Worker: apps/worker/src/modules/capture/
  → Rename to: apps/worker/src/modules/capture-worker/
  → Responsibility: Task creation from jobs
```

**Agents Module:**
```
API: apps/api/src/modules/agents/
  → Rename to: apps/api/src/modules/agent-queue/
  → Responsibility: Job queuing, progress API

Worker: apps/worker/src/modules/agents/
  → Keep name: apps/worker/src/modules/agents/
  → Responsibility: Agent orchestration, processing
```

---

### 4. Implement Event-Driven Communication

**Replace HTTP callbacks with events:**

```typescript
// Worker publishes events
await this.eventBus.publish(new AgentProgressEvent({
    taskId,
    boardId,
    progress: 50,
    message: 'Processing...',
}));

// API subscribes to events
@EventHandler(AgentProgressEvent)
class AgentProgressHandler {
    async handle(event: AgentProgressEvent) {
        this.boardGateway.emitBoardUpdate(event.boardId, {
            type: 'agent.progress',
            progress: event,
        });
    }
}
```

---

### 5. Separate Database Access

**Option A: Shared Database with API Gateway Pattern**
```
API Container
  ↓ (only API writes/reads)
Database
  ↑ (Worker reads via API or events)
```

**Option B: Database per Container (Future Microservices)**
```
API Container → API Database
Worker Container → Worker Database
  ↓ (via events/sync)
```

**Recommended: Start with Option A, migrate to Option B**

---

## Migration Strategy

### Phase 1: Extract Shared Code (Week 1-2)

1. Create shared domain package structure
2. Move utilities to shared package
3. Create repository interfaces in shared
4. Move shared types to shared package

### Phase 2: Consolidate Modules (Week 3-4)

1. Move DatabaseModule to shared infrastructure
2. Consolidate ConfigModule
3. Remove utility duplications
4. Update imports across containers

### Phase 3: Clarify Boundaries (Week 5-6)

1. Rename conflicting modules
2. Document container responsibilities
3. Create module ownership matrix
4. Update documentation

### Phase 4: Event-Driven Communication (Week 7-8)

1. Implement event bus
2. Replace HTTP callbacks with events
3. Add event handlers
4. Test event-driven flows

### Phase 5: Domain Layer Migration (Week 9-12)

1. Move domain entities to shared
2. Implement repository pattern
3. Move business logic to domain
4. Update services to use domain

---

## Benefits of Recommended Architecture

### Maintainability
- ✅ Clear module boundaries
- ✅ Single source of truth for shared code
- ✅ Easy to locate code

### Scalability
- ✅ Independent container scaling
- ✅ Clear separation of concerns
- ✅ Can split into microservices later

### Testability
- ✅ Testable shared domain
- ✅ Mockable interfaces
- ✅ Independent container testing

### Extensibility
- ✅ Easy to add new containers
- ✅ Clear contracts
- ✅ Event-driven communication

---

## Container Responsibility Checklist

### API Container ✅ Should Have

- [x] HTTP controllers
- [x] WebSocket gateway
- [ ] Use cases (application layer)
- [ ] Repository implementations
- [ ] Event bus client (publisher)
- [ ] Queue producer
- [ ] DTOs and validation

### API Container ❌ Should NOT Have

- [x] Job processors
- [x] Business logic (move to domain)
- [ ] Direct database access
- [ ] Agent orchestration
- [ ] Background tasks

### Worker Container ✅ Should Have

- [x] Job processors
- [x] Event handlers (consumers)
- [ ] Repository implementations
- [ ] Event bus client (subscriber)
- [ ] Queue consumer

### Worker Container ❌ Should NOT Have

- [x] HTTP endpoints
- [x] WebSocket
- [ ] Business logic (move to domain)
- [ ] Direct database access
- [ ] Progress HTTP callbacks (use events)

---

## Conclusion

The current container architecture has significant module duplication, unclear boundaries, and SOLID principle violations. By implementing the recommended architecture with:

1. **Shared domain package** for common code
2. **Clear container responsibilities** (API = presentation, Worker = processing)
3. **Event-driven communication** instead of HTTP callbacks
4. **Repository pattern** for data access abstraction

The system will be more maintainable, scalable, and aligned with SOLID principles at the container level.

---

## References

- [Microservices Patterns](https://microservices.io/patterns/)
- [Container Patterns](https://docs.docker.com/get-started/orchestration/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
