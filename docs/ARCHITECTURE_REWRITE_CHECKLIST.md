# Architecture Rewrite Checklist

Quick reference checklist for tracking progress through the architecture rewrite.

## Pre-Implementation Decisions

- [ ] **Database Separation:** [ ] Option A (Separate DBs) [ ] Option B (API Gateway)
- [ ] **Event Bus:** [ ] Redis Streams [ ] NATS [ ] RabbitMQ [ ] Other
- [ ] **Workflow Engine:** [ ] Custom [ ] Temporal [ ] Start Simple
- [ ] **Migration Strategy:** [ ] Strangler Fig [ ] Big Bang

---

## Phase 1: Foundation & Database Separation (Weeks 1-4)

### Week 1-2: Database Separation (CRITICAL)

#### Database Setup
- [ ] Create `kanban_api` database in docker-compose.yml
- [ ] Create `kanban_worker` database in docker-compose.yml
- [ ] Update API container DATABASE_URL environment variable
- [ ] Update Worker container DATABASE_URL environment variable
- [ ] Test API container connects to `kanban_api`
- [ ] Test Worker container connects to `kanban_worker`

#### Data Migration
- [ ] Identify data ownership (API vs Worker)
- [ ] Create migration script for API database (Users, Boards, Tasks, Projects, Tags, Rules, Columns)
- [ ] Create migration script for Worker database (Hints, AgentResults, ProcessingJobs)
- [ ] Test migration on development database
- [ ] Verify data integrity after migration
- [ ] Create rollback script

#### Prisma Updates
- [ ] Update Prisma schema to support multiple databases
- [ ] Create separate Prisma clients if needed
- [ ] Update PrismaService to use correct database per container
- [ ] Test Prisma queries work in both containers

### Week 3-4: Shared Domain Package Foundation

#### Package Structure
- [ ] Create `packages/shared/src/domain/` directory structure
- [ ] Create `packages/shared/src/domain/entities/` directory
- [ ] Create `packages/shared/src/domain/value-objects/` directory
- [ ] Create `packages/shared/src/domain/events/` directory
- [ ] Create `packages/shared/src/domain/repositories/` directory
- [ ] Create `packages/shared/src/domain/services/` directory
- [ ] Create `packages/shared/src/types/` directory
- [ ] Create `packages/shared/src/utils/` directory
- [ ] Update `packages/shared/package.json`
- [ ] Configure TypeScript paths in `tsconfig.base.json`

#### Base Classes
- [ ] Create `AggregateRoot` base class
- [ ] Create `ValueObject` base class
- [ ] Create `DomainEvent` base class
- [ ] Create `Entity` base class
- [ ] Add unit tests for base classes

#### Value Objects
- [ ] Create `TaskId` value object
- [ ] Create `BoardId` value object
- [ ] Create `ColumnId` value object
- [ ] Create `WipLimit` value object
- [ ] Create `Position` value object
- [ ] Create `Title` value object
- [ ] Create `Description` value object
- [ ] Add unit tests for all value objects

#### Utilities Migration
- [ ] Move `retry.util.ts` to `packages/shared/src/utils/`
- [ ] Move `timeout.util.ts` to `packages/shared/src/utils/`
- [ ] Move `json-parser.util.ts` to `packages/shared/src/utils/`
- [ ] Update imports in `apps/api`
- [ ] Update imports in `apps/worker`
- [ ] Test utilities work from shared package

---

## Phase 2: Repository Pattern & Domain Events (Weeks 5-8)

### Week 5-6: Repository Pattern

#### Repository Interfaces
- [ ] Create `ITaskRepository` interface in shared domain
- [ ] Create `IBoardRepository` interface
- [ ] Create `IColumnRepository` interface
- [ ] Create `IProjectRepository` interface
- [ ] Create `ITagRepository` interface
- [ ] Create `IRuleRepository` interface

#### Prisma Implementations
- [ ] Create `PrismaTaskRepository` in API infrastructure
- [ ] Create `PrismaBoardRepository` in API infrastructure
- [ ] Create `PrismaColumnRepository` in API infrastructure
- [ ] Create `PrismaProjectRepository` in API infrastructure
- [ ] Create `PrismaTagRepository` in API infrastructure
- [ ] Create `TaskMapper` (domain ↔ persistence)
- [ ] Create `BoardMapper`
- [ ] Create `ColumnMapper`
- [ ] Add unit tests for repositories
- [ ] Add integration tests for repositories

#### Service Refactoring
- [ ] Update `TaskService` to use `ITaskRepository`
- [ ] Update `BoardService` to use `IBoardRepository`
- [ ] Update `ColumnService` to use `IColumnRepository`
- [ ] Update `ProjectService` to use `IProjectRepository`
- [ ] Update `TagService` to use `ITagRepository`
- [ ] Remove direct `PrismaService` usage from services
- [ ] Update service tests to mock repositories
- [ ] Test all service methods work with repositories

### Week 7-8: Domain Events Infrastructure

#### Event Infrastructure
- [ ] Create `IEventBus` interface in shared domain
- [ ] Implement `RedisEventBus` (using Redis Streams)
- [ ] Create `@EventHandler` decorator
- [ ] Create event dispatcher service
- [ ] Create event handler registry
- [ ] Add unit tests for event bus
- [ ] Add integration tests for event bus

#### Domain Events
- [ ] Create `TaskCreatedEvent`
- [ ] Create `TaskMovedEvent`
- [ ] Create `TaskUpdatedEvent`
- [ ] Create `TaskDeletedEvent`
- [ ] Create `TaskMarkedStaleEvent`
- [ ] Create `BoardUpdatedEvent`
- [ ] Create `AgentProgressEvent`
- [ ] Create `AgentCompletedEvent`
- [ ] Create `AgentFailedEvent`
- [ ] Add unit tests for events

#### Replace Direct Calls
- [ ] Replace WebSocket direct calls with events in `TaskService`
- [ ] Replace `TaskEvent` creation with domain events
- [ ] Create `WebSocketBroadcastHandler` for events
- [ ] Create `TaskEventPersistenceHandler` for events
- [ ] Update `BoardGateway` to use event handlers
- [ ] Test event flow end-to-end
- [ ] Test WebSocket broadcasting via events

---

## Phase 3: Use Cases & Rich Domain Model (Weeks 9-12)

### Week 9-10: Use Case Extraction

#### Task Use Cases
- [ ] Create `CreateTaskUseCase`
- [ ] Create `UpdateTaskUseCase`
- [ ] Create `MoveTaskUseCase`
- [ ] Create `DeleteTaskUseCase`
- [ ] Create `GetStaleTasksUseCase`
- [ ] Create `MarkStaleUseCase`
- [ ] Add unit tests for each use case
- [ ] Add integration tests for use cases

#### Board Use Cases
- [ ] Create `CreateBoardUseCase`
- [ ] Create `UpdateBoardUseCase`
- [ ] Create `DeleteBoardUseCase`
- [ ] Add unit tests for board use cases

#### Controller Refactoring
- [ ] Update `TaskController` to use use cases
- [ ] Update `BoardController` to use use cases
- [ ] Update `ColumnController` to use use cases
- [ ] Remove direct service dependencies from controllers
- [ ] Test all HTTP endpoints
- [ ] Test WebSocket endpoints

### Week 11-12: Rich Domain Model

#### Task Entity
- [ ] Create `Task` entity class extending `AggregateRoot`
- [ ] Implement `Task.create()` factory method
- [ ] Implement `Task.moveToColumn()` method
- [ ] Implement `Task.markStale()` method
- [ ] Implement `Task.update()` method
- [ ] Add domain event generation in entity methods
- [ ] Add business rule validation in entity
- [ ] Add unit tests for Task entity

#### Board Entity
- [ ] Create `Board` entity class
- [ ] Implement `Board.create()` factory method
- [ ] Implement `Board.update()` method
- [ ] Add domain event generation
- [ ] Add unit tests for Board entity

#### Column Entity
- [ ] Create `Column` entity class
- [ ] Implement `Column.create()` factory method
- [ ] Implement WIP limit validation
- [ ] Add domain event generation
- [ ] Add unit tests for Column entity

#### Update Use Cases
- [ ] Update `CreateTaskUseCase` to use Task entity
- [ ] Update `MoveTaskUseCase` to use Task entity
- [ ] Update `UpdateTaskUseCase` to use Task entity
- [ ] Update repositories to work with entities
- [ ] Update mappers to convert entities ↔ persistence
- [ ] Test all use cases with entities
- [ ] Test entity business rules

---

## Phase 4: Orchestration Refactoring (Weeks 13-16)

### Week 13-14: Separate Orchestration from Application

#### Refactor AgentOrchestrator
- [ ] Remove `applyResultsToTask()` from `AgentOrchestrator`
- [ ] Remove database access from orchestrator
- [ ] Orchestrator only coordinates agents
- [ ] Orchestrator returns `AgentProcessingResult`
- [ ] Add unit tests for orchestrator

#### Create Application Services
- [ ] Create `AgentApplicationService`
- [ ] Implement result application logic
- [ ] Create `HintCreationService`
- [ ] Implement hint creation logic
- [ ] Services use repositories and events
- [ ] Add unit tests for application services

#### Update TaskProcessorService
- [ ] Use orchestrator for coordination only
- [ ] Use application service for applying results
- [ ] Clear separation of concerns
- [ ] Test orchestration flow
- [ ] Test result application flow

### Week 15-16: Event-Driven Progress Reporting

#### Replace HTTP Callbacks
- [ ] Remove `AgentProgressController` (HTTP callback endpoint)
- [ ] Remove callback URL from job data
- [ ] Remove HTTP callback mechanism from `AgentJobProcessor`
- [ ] Update `AgentOrchestrator` to publish `AgentProgressEvent`
- [ ] Create `AgentProgressEventHandler` in API
- [ ] Handler broadcasts via WebSocket
- [ ] Test event-driven progress flow

#### Update Agent Processing Flow
- [ ] Update `AgentCaptureService` to remove callback URL
- [ ] Update `AgentJobProcessor` to publish events
- [ ] Update job data structure (remove callback)
- [ ] Test agent processing with events
- [ ] Test progress reporting via events
- [ ] Test WebSocket broadcasting

---

## Phase 5: Module Consolidation & Container Cleanup (Weeks 17-20)

### Week 17-18: Consolidate Duplicated Modules

#### DatabaseModule Consolidation
- [ ] Create shared database module structure
- [ ] Move PrismaService to shared infrastructure
- [ ] Create API-specific database module wrapper
- [ ] Create Worker-specific database module wrapper
- [ ] Update API to use shared module
- [ ] Update Worker to use shared module
- [ ] Remove duplicated `DatabaseModule` from API
- [ ] Remove duplicated `DatabaseModule` from Worker
- [ ] Test database access in both containers

#### ConfigModule Consolidation
- [ ] Create shared config base module
- [ ] Create API-specific config schema
- [ ] Create Worker-specific config schema
- [ ] Update API to use shared config
- [ ] Update Worker to use shared config
- [ ] Remove duplicated `ConfigModule` from API
- [ ] Remove duplicated `ConfigModule` from Worker
- [ ] Test configuration in both containers

#### Rename Conflicting Modules
- [ ] Rename API `CaptureModule` → `CaptureApiModule`
- [ ] Rename Worker `CaptureModule` → `CaptureWorkerModule`
- [ ] Rename API `AgentsModule` → `AgentQueueModule`
- [ ] Update all imports in API
- [ ] Update all imports in Worker
- [ ] Update module registrations
- [ ] Test all modules work after rename

### Week 19-20: Container Boundary Clarification

#### Documentation
- [ ] Create container responsibility matrix document
- [ ] Document what API container should contain
- [ ] Document what API container should NOT contain
- [ ] Document what Worker container should contain
- [ ] Document what Worker container should NOT contain
- [ ] Create architecture diagrams
- [ ] Update README with new architecture

#### Audit & Cleanup
- [ ] Review all API container modules
- [ ] Review all Worker container modules
- [ ] Move misplaced code to correct container
- [ ] Remove container-specific code from shared
- [ ] Verify no cross-container direct dependencies
- [ ] Test all functionality after cleanup

---

## Phase 6: Advanced Patterns (Weeks 21-24) - Optional

### Week 21-22: Saga Pattern

- [ ] Create saga base classes
- [ ] Implement `TaskProcessingSaga`
- [ ] Add compensation logic
- [ ] Test failure scenarios
- [ ] Test compensation
- [ ] Update agent processing to use saga

### Week 23-24: Workflow Engine (Optional)

- [ ] Create workflow DSL
- [ ] Implement workflow executor
- [ ] Define agent processing workflow
- [ ] Add workflow monitoring
- [ ] Convert agent processing to workflow
- [ ] Test workflow execution
- [ ] Add workflow visualization

---

## Testing Checklist

### Unit Tests
- [ ] All value objects have unit tests
- [ ] All entities have unit tests
- [ ] All repositories have unit tests
- [ ] All use cases have unit tests
- [ ] All domain services have unit tests
- [ ] All event handlers have unit tests

### Integration Tests
- [ ] Repository integration tests
- [ ] Event bus integration tests
- [ ] Use case integration tests
- [ ] End-to-end API tests
- [ ] End-to-end worker tests

### Performance Tests
- [ ] Database query performance
- [ ] Event bus performance
- [ ] API endpoint performance
- [ ] Worker processing performance

---

## Documentation Checklist

- [ ] Architecture overview document
- [ ] Container responsibility matrix
- [ ] Module organization guide
- [ ] Event catalog
- [ ] Repository pattern guide
- [ ] Domain model documentation
- [ ] Migration guide
- [ ] API documentation updated
- [ ] README updated

---

## Final Validation

- [ ] All SOLID principles followed
- [ ] No direct PrismaService usage in services
- [ ] No HTTP callbacks between containers
- [ ] All communication via events
- [ ] Containers use separate databases
- [ ] No duplicated modules
- [ ] Clear container boundaries
- [ ] All tests passing
- [ ] Performance maintained/improved
- [ ] Code maintainability improved

---

**Last Updated:** [Date]
**Current Phase:** [Phase Number]
**Progress:** [X]% Complete
