# Architecture Rewrite Plan

## Executive Summary

This document provides a comprehensive plan for rewriting the architecture based on the analysis documents. The rewrite addresses critical SOLID violations, container separation issues, and orchestration problems identified in the codebase.

**Key Goals:**
1. Separate API and Worker databases (CRITICAL - violates SRP)
2. Implement Clean Architecture with proper layering
3. Replace HTTP callbacks with event-driven communication
4. Extract shared domain package
5. Implement repository pattern and domain events
6. Separate orchestration from application logic

---

## Decision Points - Need Your Input

Before we proceed, I need clarification on a few decisions:

### 1. Database Separation Strategy ⚠️

**Question:** How should we handle database separation?

**Option A: Separate Databases (Recommended)**
- API Database: Owns all domain data (Users, Boards, Tasks, Projects, Tags, Rules)
- Worker Database: Owns only processing data (Agent results, Processing jobs, Hints)
- Communication: Event-driven (API publishes events, Worker subscribes)

**Option B: API Gateway Pattern (Transitional)**
- Single database, but only API writes/reads directly
- Worker reads via API endpoints or events
- Easier migration path, but still some coupling

**Recommendation:** Option A (Separate Databases) - This is the recommended approach from the analysis docs. It provides true service separation and follows SRP.

**Your Decision:** [X] Option A  [ ] Option B  [ ] Other (specify)

---

### 2. Event Bus Implementation ⚠️

**Question:** What event bus technology should we use?

**Option A: Redis Streams (Recommended)**
- Already using Redis
- Built-in persistence and reliability
- Good performance
- No additional infrastructure

**Option B: NATS**
- Lightweight, high performance
- Built-in clustering
- Requires new infrastructure

**Option C: RabbitMQ**
- Mature, feature-rich
- Requires new infrastructure
- More complex setup

**Recommendation:** Option A (Redis Streams) - Leverages existing infrastructure, good performance, and sufficient for our needs.

**Your Decision:** [X] Option A  [ ] Option B  [ ] Option C  [ ] Other (specify)

---

### 3. Workflow Engine ⚠️

**Question:** Should we implement a full workflow engine or start simpler?

**Option A: Custom Workflow Engine (Recommended for Phase 3)**
- Declarative workflow definitions
- Built-in retry, timeout, compensation
- More control, but requires implementation

**Option B: Temporal (External Service)**
- Production-ready workflow engine
- Requires additional infrastructure
- More complex setup

**Option C: Start Simple (Recommended for Phase 1-2)**
- Use event-driven orchestration first
- Add workflow engine later if needed
- Less upfront complexity

**Recommendation:** Option C (Start Simple) - Begin with event-driven orchestration, add workflow engine in Phase 3 if needed.

**Your Decision:** [ ] Option A  [ ] Option B  [x] Option C

---

### 4. Migration Strategy ⚠️

**Question:** How aggressive should the migration be?

**Option A: Strangler Fig Pattern (Recommended)**
- Keep old code running
- Migrate incrementally module by module
- Feature flags to switch between old/new
- Lower risk, gradual migration

**Option B: Big Bang**
- Rewrite everything at once
- Higher risk, faster completion
- Requires extensive testing

**Recommendation:** Option A (Strangler Fig) - Lower risk, allows gradual migration, easier to test.

**Your Decision:** [X] Option A  [ ] Option B

---

## Architecture Overview

### Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Shared Domain Package                       │
│         (packages/shared/src/domain)                     │
├─────────────────────────────────────────────────────────┤
│  • Domain Entities (Task, Board, Column, etc.)           │
│  • Value Objects (TaskId, BoardId, WipLimit, etc.)      │
│  • Domain Events (TaskCreated, TaskMoved, etc.)         │
│  • Repository Interfaces (ITaskRepository, etc.)         │
│  • Domain Services (Interfaces)                         │
│  • Shared Types & Utilities                             │
└─────────────────────────────────────────────────────────┘
                    ↑            ↑
                    │            │
    ┌───────────────┘            └───────────────┐
    │                                             │
┌───▼──────────────────────┐  ┌──────────────────▼───────┐
│   API Container          │  │   Worker Container        │
│   (apps/api)             │  │   (apps/worker)           │
├──────────────────────────┤  ├───────────────────────────┤
│ Presentation Layer:      │  │ Processing Layer:         │
│ • HTTP Controllers       │  │ • Job Processors          │
│ • WebSocket Gateway      │  │ • Event Handlers          │
│ • DTOs/Validation        │  │ • Agent Orchestrator      │
│                          │  │                           │
│ Application Layer:       │  │ Application Layer:        │
│ • Use Cases             │  │ • Result Application      │
│   - CreateTaskUseCase   │  │ • Hint Creation          │
│   - MoveTaskUseCase     │  │                           │
│                          │  │                           │
│ Infrastructure Layer:    │  │ Infrastructure Layer:    │
│ • Prisma Repositories   │  │ • Prisma Repositories     │
│ • Event Bus (Publisher) │  │ • Event Bus (Subscriber)  │
│ • Queue Producer        │  │ • Queue Consumer          │
│                          │  │                           │
│ Database:                │  │ Database:                 │
│ • API Database          │  │ • Worker Database         │
│   (Domain Data)         │  │   (Processing Data)       │
└──────────────────────────┘  └───────────────────────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
          ┌───────────────▼───────────────┐
          │   Event Bus (Redis Streams)    │
          │   Message Queue (BullMQ)       │
          └───────────────────────────────┘
```

---

## Phase-by-Phase Implementation Plan

### Phase 1: Foundation & Database Separation (Weeks 1-4)

**Goal:** Establish foundation and separate databases

#### Week 1-2: Database Separation (CRITICAL)

**Tasks:**
1. **Create separate databases**
   - [ ] Update docker-compose.yml to create two databases:
     - `kanban_api` (for API container)
     - `kanban_worker` (for Worker container)
   - [ ] Update Prisma schema to support multiple databases
   - [ ] Create migration scripts for database separation
   - [ ] Update environment variables for each container

2. **Data Migration Strategy**
   - [ ] Identify data ownership:
     - API Database: Users, Boards, Tasks, Projects, Tags, Rules, Columns
     - Worker Database: Hints, AgentResults, ProcessingJobs
   - [ ] Create migration script to split data
   - [ ] Test migration on development database

3. **Update Database Connections**
   - [ ] Update API container DATABASE_URL
   - [ ] Update Worker container DATABASE_URL
   - [ ] Update PrismaService to use correct database per container
   - [ ] Test both containers can connect to their databases

**Deliverables:**
- Separate databases running
- Both containers connect to their respective databases
- Data successfully migrated

**Risk:** Medium - Database migration requires careful testing

---

#### Week 3-4: Shared Domain Package Foundation

**Tasks:**
1. **Create Shared Package Structure**
   - [ ] Create `packages/shared/src/domain/` structure:
     ```
     packages/shared/src/
     ├── domain/
     │   ├── entities/
     │   ├── value-objects/
     │   ├── events/
     │   ├── repositories/
     │   └── services/
     ├── types/
     └── utils/
     ```
   - [ ] Update package.json for shared package
   - [ ] Configure TypeScript paths

2. **Implement Base Classes**
   - [ ] Create `AggregateRoot` base class
   - [ ] Create `ValueObject` base class
   - [ ] Create `DomainEvent` base class
   - [ ] Create `Entity` base class

3. **Create Value Objects**
   - [ ] `TaskId` value object
   - [ ] `BoardId` value object
   - [ ] `ColumnId` value object
   - [ ] `WipLimit` value object
   - [ ] `Position` value object
   - [ ] `Title` value object
   - [ ] `Description` value object

4. **Move Utilities to Shared**
   - [ ] Move `retry.util.ts` to shared
   - [ ] Move `timeout.util.ts` to shared
   - [ ] Move `json-parser.util.ts` to shared
   - [ ] Update imports in API and Worker

**Deliverables:**
- Shared package structure created
- Base classes implemented
- Value objects created
- Utilities moved to shared

**Risk:** Low - Foundation work, minimal impact on existing code

---

### Phase 2: Repository Pattern & Domain Events (Weeks 5-8)

**Goal:** Implement repository pattern and event infrastructure

#### Week 5-6: Repository Pattern

**Tasks:**
1. **Create Repository Interfaces**
   - [ ] `ITaskRepository` interface in shared domain
   - [ ] `IBoardRepository` interface
   - [ ] `IColumnRepository` interface
   - [ ] `IProjectRepository` interface
   - [ ] `ITagRepository` interface

2. **Implement Prisma Repositories**
   - [ ] `PrismaTaskRepository` in API infrastructure
   - [ ] `PrismaBoardRepository` in API infrastructure
   - [ ] `PrismaColumnRepository` in API infrastructure
   - [ ] Create repository mappers (domain ↔ persistence)

3. **Refactor Services to Use Repositories**
   - [ ] Update `TaskService` to use `ITaskRepository`
   - [ ] Update `BoardService` to use `IBoardRepository`
   - [ ] Update other services incrementally
   - [ ] Remove direct PrismaService usage from services

**Deliverables:**
- Repository interfaces defined
- Prisma implementations created
- Services refactored to use repositories

**Risk:** Medium - Requires careful refactoring to maintain functionality

---

#### Week 7-8: Domain Events Infrastructure

**Tasks:**
1. **Implement Event Infrastructure**
   - [ ] Create `IEventBus` interface in shared domain
   - [ ] Implement `RedisEventBus` (using Redis Streams)
   - [ ] Create event handler decorator `@EventHandler`
   - [ ] Create event dispatcher service

2. **Create Domain Events**
   - [ ] `TaskCreatedEvent`
   - [ ] `TaskMovedEvent`
   - [ ] `TaskUpdatedEvent`
   - [ ] `TaskDeletedEvent`
   - [ ] `BoardUpdatedEvent`
   - [ ] `AgentProgressEvent`
   - [ ] `AgentCompletedEvent`

3. **Replace Direct Calls with Events**
   - [ ] Replace WebSocket direct calls with events
   - [ ] Replace TaskEvent creation with domain events
   - [ ] Create event handlers for WebSocket broadcasting
   - [ ] Test event flow

**Deliverables:**
- Event bus implemented
- Domain events created
- Services publish events instead of direct calls

**Risk:** Medium - Event-driven changes require careful testing

---

### Phase 3: Use Cases & Rich Domain Model (Weeks 9-12)

**Goal:** Extract use cases and implement rich domain model

#### Week 9-10: Use Case Extraction

**Tasks:**
1. **Extract Use Cases from TaskService**
   - [ ] `CreateTaskUseCase`
   - [ ] `UpdateTaskUseCase`
   - [ ] `MoveTaskUseCase`
   - [ ] `DeleteTaskUseCase`
   - [ ] `GetStaleTasksUseCase`
   - [ ] `MarkStaleUseCase`

2. **Extract Use Cases from BoardService**
   - [ ] `CreateBoardUseCase`
   - [ ] `UpdateBoardUseCase`
   - [ ] `DeleteBoardUseCase`

3. **Refactor Controllers**
   - [ ] Update controllers to use use cases
   - [ ] Remove direct service dependencies from controllers
   - [ ] Test all endpoints

**Deliverables:**
- Use cases extracted
- Controllers refactored
- All endpoints working

**Risk:** Medium - Requires careful extraction to maintain functionality

---

#### Week 11-12: Rich Domain Model

**Tasks:**
1. **Create Task Entity**
   - [ ] Move business logic to Task entity
   - [ ] Implement `Task.create()` factory method
   - [ ] Implement `Task.moveToColumn()` method
   - [ ] Implement `Task.markStale()` method
   - [ ] Add domain event generation

2. **Create Board Entity**
   - [ ] Move business logic to Board entity
   - [ ] Implement `Board.create()` factory method
   - [ ] Add domain event generation

3. **Create Column Entity**
   - [ ] Move business logic to Column entity
   - [ ] Implement WIP limit validation
   - [ ] Add domain event generation

4. **Update Use Cases**
   - [ ] Use entities instead of DTOs
   - [ ] Update repositories to work with entities
   - [ ] Test all use cases

**Deliverables:**
- Rich domain entities created
- Business logic in entities
- Use cases updated

**Risk:** High - Significant refactoring, requires extensive testing

---

### Phase 4: Orchestration Refactoring (Weeks 13-16)

**Goal:** Separate orchestration from application and implement event-driven progress

#### Week 13-14: Separate Orchestration from Application

**Tasks:**
1. **Refactor AgentOrchestrator**
   - [ ] Remove `applyResultsToTask()` from orchestrator
   - [ ] Create `AgentApplicationService` for result application
   - [ ] Orchestrator only coordinates agents
   - [ ] Orchestrator returns results, doesn't apply them

2. **Create Result Application Service**
   - [ ] `AgentApplicationService` applies results
   - [ ] `HintCreationService` creates hints
   - [ ] Services use repositories and events

3. **Update TaskProcessorService**
   - [ ] Use orchestrator for coordination
   - [ ] Use application service for applying results
   - [ ] Clear separation of concerns

**Deliverables:**
- Orchestration separated from application
- Clear responsibilities
- All tests passing

**Risk:** Medium - Requires careful refactoring

---

#### Week 15-16: Event-Driven Progress Reporting

**Tasks:**
1. **Replace HTTP Callbacks with Events**
   - [ ] Remove HTTP callback mechanism
   - [ ] Worker publishes `AgentProgressEvent`
   - [ ] API subscribes to progress events
   - [ ] API broadcasts via WebSocket

2. **Update Agent Processing Flow**
   - [ ] Remove `AgentProgressController` (HTTP callback endpoint)
   - [ ] Remove callback URL from job data
   - [ ] Update `AgentJobProcessor` to publish events
   - [ ] Create `AgentProgressEventHandler` in API

3. **Test Event-Driven Progress**
   - [ ] Test progress events flow
   - [ ] Test WebSocket broadcasting
   - [ ] Test error scenarios

**Deliverables:**
- HTTP callbacks removed
- Event-driven progress working
- WebSocket broadcasting working

**Risk:** Medium - Requires testing of event flow

---

### Phase 5: Module Consolidation & Container Cleanup (Weeks 17-20)

**Goal:** Consolidate duplicated modules and clarify container boundaries

#### Week 17-18: Consolidate Duplicated Modules

**Tasks:**
1. **Move DatabaseModule to Shared**
   - [x] Create shared database module structure
   - [x] Move PrismaService to shared infrastructure
   - [x] Update API to use shared module
   - [x] Update Worker to use shared module
   - [x] Remove duplicated DatabaseModule

2. **Consolidate ConfigModule**
   - [x] Create shared config base
   - [x] Create API-specific config schema
   - [x] Create Worker-specific config schema
   - [x] Update both containers to use shared config
   - [x] Remove duplicated ConfigModule

3. **Rename Conflicting Modules**
   - [x] Rename API `CaptureModule` → `CaptureApiModule`
   - [x] Rename Worker `CaptureModule` → `CaptureWorkerModule`
   - [x] Rename API `AgentsModule` → `AgentApiModule`
   - [x] Update all imports

**Deliverables:**
- Duplicated modules consolidated
- Clear module boundaries
- All imports updated

**Risk:** Low - Mostly organizational changes

---

#### Week 19-20: Container Boundary Clarification

**Tasks:**
1. **Document Container Responsibilities**
   - [x] Create container responsibility matrix
   - [x] Document what each container should/shouldn't contain
   - [x] Update architecture documentation

2. **Audit Container Contents**
   - [x] Review API container modules
   - [x] Review Worker container modules
   - [x] Move misplaced code
   - [x] Remove container-specific code from shared

3. **Update Documentation**
   - [x] Update README with new architecture
   - [x] Create architecture diagrams
   - [x] Document migration path

**Deliverables:**
- Clear container boundaries
- Documentation updated
- Architecture diagrams created

**Risk:** Low - Documentation and organization

---

### Phase 6: Advanced Patterns (Weeks 21-24) - Optional

**Goal:** Implement advanced patterns for better reliability and scalability

#### Week 21-22: Saga Pattern

**Tasks:**
1. **Implement Saga Pattern**
   - [ ] Create saga base classes
   - [ ] Implement `TaskProcessingSaga`
   - [ ] Add compensation logic
   - [ ] Test failure scenarios

2. **Update Agent Processing**
   - [ ] Use saga for agent processing
   - [ ] Handle partial failures
   - [ ] Implement rollback

**Deliverables:**
- Saga pattern implemented
- Compensation logic working
- Better error handling

**Risk:** Medium - Complex pattern implementation

---

#### Week 23-24: Workflow Engine (Optional)

**Tasks:**
1. **Implement Workflow Engine**
   - [ ] Create workflow DSL
   - [ ] Implement workflow executor
   - [ ] Define agent processing workflow
   - [ ] Add workflow monitoring

2. **Migrate to Workflow**
   - [ ] Convert agent processing to workflow
   - [ ] Test workflow execution
   - [ ] Add workflow visualization

**Deliverables:**
- Workflow engine implemented
- Agent processing uses workflow
- Better observability

**Risk:** High - Complex implementation, may not be needed

---

## Migration Strategy: Strangler Fig Pattern

### Approach

1. **Parallel Implementation**
   - Keep old code running
   - Implement new architecture alongside
   - Use feature flags to switch between implementations

2. **Incremental Migration**
   - Migrate one module at a time
   - Test thoroughly before moving to next
   - Keep old code until new is proven

3. **Feature Flags**
   ```typescript
   // Example feature flag
   if (config.useNewRepositoryPattern) {
       return await newTaskRepository.save(task);
   } else {
       return await oldTaskService.createTask(input);
   }
   ```

4. **Testing Strategy**
   - Write tests for new architecture first
   - Compare outputs between old and new
   - Ensure backward compatibility during migration

---

## Risk Assessment & Mitigation

### High Risk Items

1. **Database Separation** (Phase 1)
   - **Risk:** Data loss, migration issues
   - **Mitigation:** 
     - Thorough testing on development database
     - Backup before migration
     - Rollback plan ready

2. **Rich Domain Model** (Phase 3)
   - **Risk:** Breaking changes, extensive refactoring
   - **Mitigation:**
     - Incremental migration
     - Extensive testing
     - Feature flags

3. **Event-Driven Changes** (Phase 2, 4)
   - **Risk:** Event delivery failures, race conditions
   - **Mitigation:**
     - Use reliable event bus (Redis Streams)
     - Implement idempotency
     - Add monitoring

### Medium Risk Items

1. **Repository Pattern** (Phase 2)
   - **Risk:** Performance issues, mapping errors
   - **Mitigation:**
     - Performance testing
     - Careful mapping implementation
     - Gradual migration

2. **Use Case Extraction** (Phase 3)
   - **Risk:** Missing functionality, breaking changes
   - **Mitigation:**
     - Comprehensive testing
     - Feature flags
     - Incremental extraction

---

## Success Criteria

### Phase 1 Success
- [ ] API and Worker use separate databases
- [ ] Data successfully migrated
- [ ] Shared package structure created
- [ ] Value objects implemented

### Phase 2 Success
- [ ] Repository pattern implemented
- [ ] Services use repositories (no direct Prisma)
- [ ] Event bus working
- [ ] Domain events published

### Phase 3 Success
- [ ] Use cases extracted
- [ ] Rich domain entities created
- [ ] Business logic in entities
- [ ] All endpoints working

### Phase 4 Success
- [ ] Orchestration separated from application
- [ ] Event-driven progress reporting
- [ ] No HTTP callbacks between containers

### Phase 5 Success
- [ ] No duplicated modules
- [ ] Clear container boundaries
- [ ] Documentation updated

### Overall Success
- [ ] All SOLID principles followed
- [ ] Containers can scale independently
- [ ] Test coverage maintained/improved
- [ ] Performance maintained/improved
- [ ] Code maintainability improved

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| Phase 1: Foundation | 4 weeks | Separate databases, shared package |
| Phase 2: Repository & Events | 4 weeks | Repository pattern, event bus |
| Phase 3: Use Cases & Domain | 4 weeks | Use cases, rich domain model |
| Phase 4: Orchestration | 4 weeks | Separated orchestration, event-driven progress |
| Phase 5: Module Consolidation | 4 weeks | Consolidated modules, clear boundaries |
| Phase 6: Advanced (Optional) | 4 weeks | Saga pattern, workflow engine |

**Total Duration:** 20-24 weeks (5-6 months)

---

## Next Steps

1. **Review this plan** and provide decisions on:
   - Database separation strategy
   - Event bus technology
   - Workflow engine approach
   - Migration strategy

2. **Prioritize phases** - Do you want to start with Phase 1, or adjust priorities?

3. **Set up tracking** - Create GitHub issues/project board for tracking

4. **Begin Phase 1** - Start with database separation (CRITICAL)

---

## Questions for You

1. **Timeline:** Is the 5-6 month timeline acceptable, or do you need it faster?

2. **Scope:** Should we include Phase 6 (Advanced Patterns), or focus on Phases 1-5?

3. **Testing:** What's your testing strategy? Should we maintain 100% test coverage during migration?

4. **Deployment:** How do you want to handle deployments during migration? Blue-green? Feature flags?

5. **Documentation:** Should we update documentation incrementally or at the end?

---

**Ready to proceed?** Please provide your decisions on the questions above, and we can start with Phase 1!
