# Container Boundaries and Responsibilities

This document defines the clear boundaries and responsibilities for each container in the Personal Kanban system.

## Overview

The system consists of three main containers:
- **API Container**: HTTP API server, WebSocket gateway, request handling
- **Worker Container**: Background job processing, agent orchestration, integrations
- **Web Container**: Static frontend application (React)

## Container Responsibilities Matrix

| Responsibility | API Container | Worker Container | Web Container |
|---------------|---------------|-----------------|---------------|
| HTTP REST API | ✅ Primary | ❌ | ❌ |
| WebSocket Gateway | ✅ Primary | ❌ | ❌ |
| Authentication/Authorization | ✅ Primary | ❌ | ❌ |
| Task CRUD Operations | ✅ Primary | ❌ | ❌ |
| Board Management | ✅ Primary | ❌ | ❌ |
| Agent Processing | ❌ | ✅ Primary | ❌ |
| Background Jobs | ❌ | ✅ Primary | ❌ |
| Email Integration (IMAP) | ❌ | ✅ Primary | ❌ |
| Email Notifications (SMTP) | ❌ | ✅ Primary | ❌ |
| Event Publishing | ✅ | ✅ | ❌ |
| Event Consumption | ✅ | ✅ | ❌ |
| Database Access | ✅ (API DB) | ✅ (Worker DB) | ❌ |
| Frontend UI | ❌ | ❌ | ✅ Primary |

## API Container (`apps/api`)

### Primary Responsibilities

1. **HTTP API Server**
   - RESTful endpoints for all domain operations
   - Request validation and authorization
   - Response formatting

2. **WebSocket Gateway**
   - Real-time updates to connected clients
   - Board state synchronization
   - Agent progress broadcasting

3. **Authentication & Authorization**
   - Session management
   - JWT token generation and validation
   - User authentication flows

4. **Domain Operations**
   - Task CRUD operations (via use cases)
   - Board management
   - Column management
   - Project management
   - Tag management
   - Rule management
   - Template management

5. **Event Publishing**
   - Publishes domain events to Redis event bus
   - Handles event persistence to TaskEvent table

6. **Agent Queue Management**
   - Queues agent processing jobs to BullMQ
   - Provides agent status endpoints

### Database

- **Database**: `kanban_api` (PostgreSQL)
- **Access**: Read/write access to all tables
- **Purpose**: Primary data store for user-facing operations

### Modules

- `AuthModule` - Authentication and authorization
- `BoardModule` - Board management
- `TaskModule` - Task management
- `ProjectModule` - Project management
- `TagModule` - Tag management
- `RuleModule` - Automation rules
- `TemplateModule` - Recurring templates
- `AnalyticsModule` - Analytics and reporting
- `ClarificationModule` - Task clarification workflows
- `RealtimeModule` - WebSocket gateway
- `CaptureApiModule` - Task capture endpoints
- `AgentApiModule` - Agent information endpoints
- `EmailActionsModule` - Email action token handling
- `EventsModule` - Event infrastructure (publishing and handlers)
- `LlmModule` - LLM service client
- `RateLimitModule` - Rate limiting

### Should NOT Contain

- ❌ Agent orchestration logic
- ❌ Background job processors
- ❌ IMAP/SMTP integration code
- ❌ Long-running processes
- ❌ Direct access to Worker database

## Worker Container (`apps/worker`)

### Primary Responsibilities

1. **Background Job Processing**
   - Processes BullMQ jobs
   - Handles async operations
   - Manages job retries and failures

2. **Agent Orchestration**
   - Coordinates agent execution
   - Manages agent pipelines
   - Applies agent results to tasks

3. **Email Integration**
   - IMAP polling for email ingestion
   - SMTP sending for notifications
   - Email reminder processing

4. **Event Publishing**
   - Publishes agent progress events
   - Publishes agent completion events

5. **Task Processing**
   - Quick task creation from integrations
   - Task prioritization
   - Stale task detection

### Database

- **Database**: `kanban_worker` (PostgreSQL)
- **Access**: Read/write access to all tables
- **Purpose**: Worker-specific data and job state

### Modules

- `AgentsModule` - Agent orchestration and processing
- `CaptureWorkerModule` - Quick task creation
- `IntegrationsModule` - IMAP integration
- `NotificationsModule` - Email notifications and reminders
- `EventsModule` - Event infrastructure (publishing)

### Should NOT Contain

- ❌ HTTP controllers (except health checks)
- ❌ WebSocket gateways
- ❌ Authentication logic
- ❌ Direct access to API database
- ❌ User-facing business logic

## Web Container (`apps/web`)

### Primary Responsibilities

1. **Frontend Application**
   - React-based UI
   - User interface for all features
   - Client-side routing

2. **API Communication**
   - HTTP requests to API container
   - WebSocket connections to API container

### Should NOT Contain

- ❌ Backend logic
- ❌ Database access
- ❌ Server-side processing

## Shared Package (`packages/shared`)

### Purpose

Contains framework-agnostic code shared between containers.

### Contents

1. **Domain Layer**
   - Domain entities (`Task`, `Board`, `Column`)
   - Value objects (`TaskId`, `BoardId`, `Title`, etc.)
   - Domain events
   - Repository interfaces

2. **Infrastructure Layer**
   - `DatabaseModule` - Shared PrismaService
   - Config schemas - Base and container-specific schemas

3. **Utilities**
   - Framework-agnostic utility functions
   - Retry logic
   - Timeout handling
   - JSON parsing

### Should NOT Contain

- ❌ Framework-specific code (except infrastructure modules)
- ❌ Container-specific business logic
- ❌ HTTP controllers
- ❌ Background job processors

## Communication Patterns

### API ↔ Worker

- **Primary**: Redis Event Bus (domain events)
- **Secondary**: BullMQ (job queue)
- **Avoid**: Direct HTTP calls between containers

### API ↔ Web

- **Primary**: HTTP REST API
- **Secondary**: WebSocket for real-time updates

### Worker ↔ External Services

- **IMAP**: Direct IMAP protocol for email polling
- **SMTP**: Direct SMTP protocol for email sending

## Database Separation

### API Database (`kanban_api`)

- Contains all user-facing data
- Task, Board, Column, Project, Tag, Rule, Template tables
- TaskEvent table for audit trail
- User and session data

### Worker Database (`kanban_worker`)

- Contains worker-specific data
- Job state and metadata
- Integration credentials
- Worker-specific configuration

### Shared Infrastructure

- **Redis**: Shared event bus and job queue
- **PrismaService**: Shared service, but connects to different databases based on `DATABASE_URL`

## Module Naming Conventions

### API Modules

- Use descriptive names: `BoardModule`, `TaskModule`
- For container-specific modules, use `*ApiModule` suffix: `CaptureApiModule`, `AgentApiModule`

### Worker Modules

- Use descriptive names: `AgentsModule`, `NotificationsModule`
- For container-specific modules, use `*WorkerModule` suffix: `CaptureWorkerModule`

### Shared Modules

- Use generic names: `DatabaseModule`, `ConfigModule`
- No container-specific suffixes

## Migration Guidelines

When moving code between containers:

1. **Domain Logic** → Move to `packages/shared` if framework-agnostic
2. **API Endpoints** → Keep in API container
3. **Background Jobs** → Move to Worker container
4. **Shared Infrastructure** → Move to `packages/shared/infrastructure`

## Anti-Patterns to Avoid

1. ❌ **Shared Database**: Each container should have its own database
2. ❌ **Direct Container Calls**: Use events/queues instead of HTTP
3. ❌ **Framework Code in Shared**: Keep shared package framework-agnostic
4. ❌ **Worker HTTP Controllers**: Workers should not expose HTTP endpoints
5. ❌ **API Background Jobs**: API should queue jobs, not process them

## Future Considerations

- Consider splitting Worker into multiple specialized workers (email, agents, notifications)
- Consider API read/write separation (CQRS pattern)
- Consider event sourcing for audit trail
