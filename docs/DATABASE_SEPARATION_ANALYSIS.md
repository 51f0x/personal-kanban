# Database Separation Analysis: Single Responsibility Principle

## Executive Summary

This document analyzes the critical architectural violation where API and Worker containers share the same database. This violates the Single Responsibility Principle at the container level and creates a distributed monolith rather than proper service separation. The analysis provides strategies for proper database separation aligned with SOLID principles.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [SOLID Violations](#solid-violations)
3. [Data Access Patterns](#data-access-patterns)
4. [Separation Strategies](#separation-strategies)
5. [Recommended Architecture](#recommended-architecture)
6. [Migration Strategy](#migration-strategy)

---

## Current State Analysis

### 🔴 Critical Violation: Shared Database

**Current Architecture:**
```yaml
# docker-compose.yml
api:
  environment:
    DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban

worker:
  environment:
    DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban  # ❌ SAME DATABASE
```

**Problem:**
- Both containers connect to the **exact same database**
- Both containers have **full read/write access** to all tables
- No boundaries, no separation, no isolation
- Creates a **distributed monolith** disguised as microservices

---

## SOLID Violations

### ❌ **Single Responsibility Principle - Container Level**

**Violation:** Containers share data ownership responsibility

**Current:**
- **API Container**: Owns HTTP/WebSocket + reads/writes all data
- **Worker Container**: Owns job processing + reads/writes all data
- **Shared Database**: Both containers own the same data

**Problem:**
- Each container should have **single responsibility** for data it owns
- Shared database means **no clear ownership**
- Changes to schema affect both containers
- Cannot scale or deploy independently

**Impact:** Distributed monolith, tight coupling, violates SRP at container level

---

### ❌ **Dependency Inversion Principle**

**Violation:** Containers depend on concrete database implementation

**Current:**
```
API Container → PrismaService → Postgres Database
Worker Container → PrismaService → Postgres Database (SAME)
```

**Problem:**
- Both containers depend on **same concrete database**
- No abstraction between containers
- Database becomes **coupling point**
- Cannot swap database implementations independently

**Impact:** Tight coupling, violates DIP

---

## Data Access Patterns Analysis

### API Container Database Access

**Tables Accessed (from code analysis):**

| Table | Read | Write | Purpose |
|-------|------|-------|---------|
| `users` | ✅ | ✅ | Authentication, user management |
| `boards` | ✅ | ✅ | Board CRUD operations |
| `columns` | ✅ | ✅ | Column management, WIP checks |
| `tasks` | ✅ | ✅ | Task CRUD, queries, updates |
| `projects` | ✅ | ✅ | Project management |
| `tags` | ✅ | ✅ | Tag management |
| `task_tags` | ✅ | ✅ | Task-tag associations |
| `checklist_items` | ✅ | ✅ | Checklist management |
| `task_events` | ✅ | ✅ | Event logging (created by API) |
| `rules` | ✅ | ✅ | Rule CRUD (API manages rules) |
| `recurring_templates` | ✅ | ✅ | Template management |
| `hints` | ✅ | ✅ | Hint reading (worker writes) |
| `email_action_tokens` | ✅ | ✅ | Email action links |

**API Container Responsibility:**
- **Primary**: HTTP/WebSocket interface for user interactions
- **Data Access**: Direct database access for all domain entities
- **Writes**: User-initiated changes (task creation, moves, updates)

---

### Worker Container Database Access

**Tables Accessed (from code analysis):**

| Table | Read | Write | Purpose |
|-------|------|-------|---------|
| `tasks` | ✅ | ✅ | Read for processing, write hints/results |
| `boards` | ✅ | ❌ | Read board info for task creation |
| `columns` | ✅ | ❌ | Read column info |
| `users` | ✅ | ❌ | Read user info for notifications |
| `hints` | ✅ | ✅ | Create hints, update applied status |
| `task_events` | ❌ | ✅ | Write events (should be via API) |

**Worker Container Responsibility:**
- **Primary**: Background job processing
- **Data Access**: Reads tasks, writes processing results
- **Writes**: Agent results, hints, task updates from jobs

---

## The Core Problem

### Shared Database = Distributed Monolith

**Current Architecture:**
```
┌─────────────┐         ┌──────────────┐
│  API        │────────▶│              │
│  Container  │         │   Shared     │
└─────────────┘         │  Database    │
                        │  (Postgres)  │
┌─────────────┐         │              │
│  Worker     │────────▶│              │
│  Container  │         │              │
└─────────────┘         └──────────────┘
```

**This is NOT microservices - it's a distributed monolith!**

**Problems:**
1. **No data ownership boundaries**
2. **Schema changes affect both containers**
3. **Cannot scale databases independently**
4. **Transaction boundaries unclear**
5. **Data consistency issues**
6. **Cannot deploy independently**

---

## Separation Strategies

### Strategy 1: Database per Container (Recommended)

**Architecture:**
```
┌─────────────┐         ┌──────────────┐
│  API        │────────▶│   API DB     │
│  Container  │         │  (Postgres)  │
└─────────────┘         └──────────────┘
        │
        │ Events/Commands
        ▼
┌─────────────┐         ┌──────────────┐
│  Worker     │────────▶│  Worker DB   │
│  Container  │         │  (Postgres)  │
└─────────────┘         └──────────────┘
```

**API Database Contains:**
- `users` - User accounts, authentication
- `boards` - Board definitions
- `columns` - Column definitions
- `tasks` - Task data (source of truth)
- `projects` - Project data
- `tags` - Tag definitions
- `rules` - Automation rules
- `templates` - Recurring templates
- `task_events` - Event log (written by API)
- `email_action_tokens` - Email links

**Worker Database Contains:**
- `task_processing_jobs` - Job queue state
- `agent_results` - Agent processing results
- `hints` - Generated hints (eventually synced to API)
- `processing_metadata` - Worker-specific metadata

**Communication:**
- API publishes domain events (TaskCreated, TaskUpdated)
- Worker subscribes to events, processes, publishes results
- Worker results synced back via events or API calls

**Benefits:**
- ✅ Clear data ownership
- ✅ Independent scaling
- ✅ Independent deployment
- ✅ Clear boundaries
- ✅ Follows SRP

**Challenges:**
- Eventual consistency
- Event sourcing needed
- More complex sync logic

---

### Strategy 2: API as Data Owner + Worker Read Replicas

**Architecture:**
```
┌─────────────┐         ┌──────────────┐
│  API        │────────▶│   Primary    │
│  Container  │    W    │   Database   │
└─────────────┘         │  (Postgres)  │
                        └──────┬───────┘
                               │ Replication
                        ┌──────▼───────┐
┌─────────────┐         │   Read       │
│  Worker     │────────▶│   Replica    │
│  Container  │    R    │  (Postgres)  │
└─────────────┘         └──────────────┘
```

**Responsibilities:**
- **API**: Owns all data, writes to primary database
- **Worker**: Reads from replica, writes results back via API or events

**Worker Write Strategy:**
1. Worker processes task (reads from replica)
2. Worker publishes results as events
3. API subscribes to events, writes to database
4. OR: Worker makes API calls to update data

**Benefits:**
- ✅ API owns all data (single source of truth)
- ✅ Worker can read without blocking API
- ✅ Clear ownership

**Challenges:**
- Replication lag
- Worker writes need to go through API
- More complex write paths

---

### Strategy 3: Command/Query Separation (CQRS)

**Architecture:**
```
┌─────────────┐         ┌──────────────┐
│  API        │────────▶│  Command DB  │
│  Container  │    W    │  (Write)     │
└─────────────┘         └──────┬───────┘
                               │ Events
                        ┌──────▼───────┐
┌─────────────┐         │   Query DB   │
│  Worker     │────────▶│  (Read)      │
│  Container  │    R/W  │  (Denormalized)
└─────────────┘         └──────────────┘
```

**Responsibilities:**
- **API**: Writes commands to Command DB, reads from Query DB
- **Worker**: Processes commands, updates Query DB, publishes events
- **Event Processor**: Syncs Command DB → Query DB

**Benefits:**
- ✅ Clear separation of read/write
- ✅ Optimized for each workload
- ✅ Scalable

**Challenges:**
- Complex event sourcing
- Eventual consistency
- More moving parts

---

### Strategy 4: Event Sourcing + Separate Stores (Advanced)

**Architecture:**
```
┌─────────────┐         ┌──────────────┐
│  API        │────────▶│  Event Store │
│  Container  │  Events │  (Events)    │
└─────────────┘         └──────┬───────┘
                               │ Events
                        ┌──────▼───────┐
┌─────────────┐         │  Read Models │
│  Worker     │────────▶│  (Projected) │
│  Container  │  R/W    │              │
└─────────────┘         └──────────────┘
```

**Benefits:**
- ✅ Complete audit trail
- ✅ Time travel
- ✅ Complete separation

**Challenges:**
- Most complex
- Requires event sourcing infrastructure
- Learning curve

---

## Recommended Architecture

### Phase 1: Immediate Separation (Database per Container)

**Recommended Approach:**

```
┌─────────────────────────────────────────────────────────┐
│                    API Container                         │
│  (apps/api)                                              │
├─────────────────────────────────────────────────────────┤
│  Responsibility: HTTP/WebSocket Interface                │
│  Data Ownership: All domain data                         │
│                                                           │
│  Database: api_db (Postgres)                             │
│    - users, boards, tasks, projects, tags, rules         │
│    - task_events (written by API)                        │
│                                                           │
│  Writes: Direct to database                              │
│  Reads: Direct from database                             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ Publishes Domain Events
                        │ (TaskCreated, TaskUpdated, etc.)
                        ▼
        ┌───────────────────────────────┐
        │     Event Bus (Redis/NATS)     │
        └───────────────┬───────────────┘
                        │
                        │ Subscribes to Events
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Worker Container                        │
│  (apps/worker)                                           │
├─────────────────────────────────────────────────────────┤
│  Responsibility: Background Processing                   │
│  Data Ownership: Processing results, job state           │
│                                                           │
│  Database: worker_db (Postgres)                          │
│    - agent_results                                       │
│    - hints (processing output)                           │
│    - job_state                                           │
│    - processing_metadata                                 │
│                                                           │
│  Reads: Domain events from Event Bus                     │
│  Writes: Results to worker_db                            │
│  Sync: Publishes results as events → API writes to api_db│
└─────────────────────────────────────────────────────────┘
```

---

### Data Ownership Matrix

| Entity | API Database | Worker Database | Sync Method |
|--------|-------------|-----------------|-------------|
| `users` | ✅ Owns | ❌ None | N/A |
| `boards` | ✅ Owns | ❌ None | N/A |
| `columns` | ✅ Owns | ❌ None | N/A |
| `tasks` | ✅ Owns (source of truth) | ❌ None | Worker reads via events/API |
| `projects` | ✅ Owns | ❌ None | N/A |
| `tags` | ✅ Owns | ❌ None | N/A |
| `rules` | ✅ Owns | ❌ None | Worker reads via events |
| `task_events` | ✅ Owns | ❌ None | Worker creates events, API writes |
| `hints` | ✅ Owns (synced from worker) | ✅ Creates (temporary) | Worker publishes HintCreated event, API syncs |
| `agent_results` | ❌ None | ✅ Owns | Worker publishes ResultsReady event |

---

## Detailed Implementation

### Step 1: Separate Database Connections

**Before:**
```yaml
# docker-compose.yml
api:
  DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban

worker:
  DATABASE_URL: postgresql://kanban:kanban@postgres:5432/kanban  # ❌ SAME
```

**After:**
```yaml
# docker-compose.yml
postgres-api:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: kanban_api
    POSTGRES_DB: kanban_api
  volumes:
    - api_db_data:/var/lib/postgresql/data

postgres-worker:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: kanban_worker
    POSTGRES_DB: kanban_worker
  volumes:
    - worker_db_data:/var/lib/postgresql/data

api:
  DATABASE_URL: postgresql://kanban_api:password@postgres-api:5432/kanban_api

worker:
  DATABASE_URL: postgresql://kanban_worker:password@postgres-worker:5432/kanban_worker
```

---

### Step 2: Define API Database Schema

**API Database Schema (Full Domain):**
```prisma
// prisma/api-schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/api-client"
}

datasource db {
  provider = "postgresql"
  url      = env("API_DATABASE_URL")
}

// All domain models: User, Board, Column, Task, Project, Tag, etc.
model User { /* ... */ }
model Board { /* ... */ }
model Task { /* ... */ }
model Hint { /* ... */ }  // Synced from worker
// ... all other domain models
```

---

### Step 3: Define Worker Database Schema

**Worker Database Schema (Processing Only):**
```prisma
// prisma/worker-schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/worker-client"
}

datasource db {
  provider = "postgresql"
  url      = env("WORKER_DATABASE_URL")
}

// Worker-specific models only
model AgentProcessingJob {
  id        String   @id @default(uuid())
  taskId    String   // Reference to task in API DB (not FK)
  status    String   // pending, processing, completed, failed
  startedAt DateTime?
  completedAt DateTime?
  error     String?
  metadata  Json?
}

model AgentResult {
  id          String   @id @default(uuid())
  taskId      String   // Reference to task in API DB
  agentId     String
  result      Json     // Processing result
  confidence  Float?
  createdAt   DateTime @default(now())
}

model HintDraft {
  id         String   @id @default(uuid())
  taskId     String   // Reference to task in API DB
  agentId    String
  hintType   String
  content    String?
  data       Json?
  confidence Float?
  createdAt  DateTime @default(now())
  synced     Boolean  @default(false) // Synced to API DB
}
```

---

### Step 4: Event-Driven Communication

**API Publishes Events:**
```typescript
// API: When task is created
await this.eventBus.publish(new TaskCreatedEvent({
    taskId: task.id,
    boardId: task.boardId,
    title: task.title,
    // ... task data
}));
```

**Worker Subscribes to Events:**
```typescript
// Worker: Process task when created
@EventHandler(TaskCreatedEvent)
class TaskCreatedHandler {
    async handle(event: TaskCreatedEvent) {
        // Store job in worker DB
        await this.workerDb.agentProcessingJob.create({
            data: {
                taskId: event.taskId,
                status: 'pending',
            },
        });
        
        // Queue processing
        await this.queue.add('process-task', { taskId: event.taskId });
    }
}
```

**Worker Publishes Results:**
```typescript
// Worker: After processing
await this.eventBus.publish(new AgentProcessingCompletedEvent({
    taskId,
    hints: [...], // Hint data
    results: {...}, // Agent results
}));
```

**API Syncs Results:**
```typescript
// API: Sync worker results to API DB
@EventHandler(AgentProcessingCompletedEvent)
class AgentResultsHandler {
    async handle(event: AgentProcessingCompletedEvent) {
        // Write hints to API database
        await this.apiDb.hint.createMany({
            data: event.hints.map(hint => ({
                taskId: hint.taskId,
                agentId: hint.agentId,
                // ... hint data
            })),
        });
    }
}
```

---

### Step 5: Worker Read Strategy

**Worker needs task data but doesn't own it:**

**Option A: Event Carrying State**
```typescript
// API publishes full task data in event
await this.eventBus.publish(new TaskCreatedEvent({
    taskId,
    boardId,
    title,
    description,
    // ... all task data needed for processing
}));
```

**Option B: API Query Endpoint**
```typescript
// Worker queries API for task data
const task = await this.httpClient.get(`/api/tasks/${taskId}`);
```

**Option C: Read Replica (Future)**
```typescript
// Worker reads from read replica of API database
// (Still violates SRP but better than direct write access)
```

**Recommended:** Start with Option A (Event Carrying State), migrate to Option B if needed

---

## Migration Strategy

### Phase 1: Add Event Infrastructure (Week 1-2)

1. Implement event bus (Redis pub/sub or NATS)
2. Define domain events
3. Add event publishers to API
4. Add event subscribers to Worker
5. Test event flow

### Phase 2: Create Worker Database (Week 3)

1. Create separate Postgres instance for Worker
2. Define worker schema (processing-only tables)
3. Update Worker to use worker database
4. Migrate worker-specific data

### Phase 3: Remove Worker Direct Access (Week 4-5)

1. Replace Worker direct DB reads with event data
2. Replace Worker direct DB writes with events
3. API syncs worker results via events
4. Remove Worker database access to API tables

### Phase 4: Full Separation (Week 6-8)

1. Split database schemas completely
2. API owns all domain data
3. Worker owns only processing data
4. All communication via events
5. Remove shared database dependency

---

## Benefits of Database Separation

### Single Responsibility
- ✅ API container owns domain data
- ✅ Worker container owns processing data
- ✅ Clear boundaries

### Independent Scaling
- ✅ Scale API database for user load
- ✅ Scale Worker database for processing load
- ✅ Different replication strategies

### Independent Deployment
- ✅ Deploy API without affecting Worker
- ✅ Deploy Worker without affecting API
- ✅ Schema changes isolated

### Clear Ownership
- ✅ Who owns what data is clear
- ✅ Who can change what is clear
- ✅ Data consistency boundaries clear

---

## Alternative: Gradual Migration Path

### Stage 1: Read-Only Worker Access

**Worker reads from API database (read-only connection):**

```typescript
// Worker uses read-only database user
WORKER_DATABASE_URL: postgresql://worker_readonly:password@postgres:5432/kanban

// API grants read-only access
GRANT SELECT ON ALL TABLES IN SCHEMA public TO worker_readonly;
```

**Worker writes to separate worker database:**
```typescript
WORKER_RESULTS_DATABASE_URL: postgresql://worker:password@postgres-worker:5432/worker_results
```

**Benefits:**
- ✅ Worker cannot accidentally modify domain data
- ✅ Clear separation of concerns
- ✅ Gradual migration path

---

## Container Responsibility Matrix (Revised)

### API Container

**Should Own:**
- ✅ All domain data (users, boards, tasks, etc.)
- ✅ Authentication and authorization
- ✅ HTTP/WebSocket interface
- ✅ Domain event publishing

**Should NOT:**
- ❌ Process background jobs
- ❌ Have processing-specific data
- ❌ Direct access to worker data

---

### Worker Container

**Should Own:**
- ✅ Processing job state
- ✅ Agent results (temporary)
- ✅ Processing metadata
- ✅ Background job queues

**Should NOT:**
- ❌ Domain data (users, boards, tasks)
- ❌ HTTP endpoints
- ❌ Direct writes to domain data

**Should:**
- ✅ Subscribe to domain events
- ✅ Publish processing results as events
- ✅ Read domain data via events or API

---

## Conclusion

The current shared database architecture violates the Single Responsibility Principle at the container level. Each container should own its data responsibility:

- **API Container**: Owns all domain data (source of truth)
- **Worker Container**: Owns processing data only
- **Communication**: Via events, not shared database

By separating databases and using event-driven communication, the system will have:
- ✅ Clear data ownership
- ✅ Independent scaling
- ✅ Proper SRP compliance
- ✅ True service separation

---

## References

- [Database per Service Pattern](https://microservices.io/patterns/data/database-per-service.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Distributed Monolith Anti-Pattern](https://microservices.io/patterns/monolithic.html)
