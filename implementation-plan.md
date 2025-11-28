# Implementation Plan

## 1. Objectives
- Deliver a self-hosted Personal Kanban + GTD platform on the Node/Nest/BullMQ stack described in the SRS.
- Replace third-party automation with native capture, clarification, automation rules, recurring templates, and analytics.
- Ship incrementally with verifiable milestones so the system remains deployable throughout.

## 2. Baseline Architecture Commitments
- **Backend**: NestJS modular monolith (API + domain modules + shared library) with Prisma or TypeORM for Postgres, REST + GraphQL + WebSockets.
- **Asynchronous processing**: BullMQ workers (Redis) for rule execution, scheduling, IMAP polling, analytics, notifications.
- **Frontend**: React SPA/PWA (Vite + TypeScript) consuming REST/WebSocket APIs; shared DTOs via generated clients.
- **Storage**: Postgres 14+ (JSONB for metadata), Redis 6+ for queues/cache, optional S3-compatible object storage for email payloads.
- **Deployment**: Docker Compose (dev) and containerized services behind Nginx/Caddy with TLS; OpenTelemetry + Prometheus for observability.

---

## 2A. Current Implementation Status (Updated: Gap Analysis)

### Phase Completion Summary
| Phase | Status | Completion | Next Actions |
| --- | --- | --- | --- |
| Phase 1: Infrastructure | ✅ Complete | 100% | — |
| Phase 2: Core Board UI | ✅ Complete | 100% | — |
| Phase 3: Security Foundation | ⚠️ Partial | 40% | Session/JWT auth, CSRF |
| Phase 4: GTD Clarification | ⚠️ Partial | 50% | Wizard UI, Someday/Waiting views |
| Phase 5: Automation Engine | ⚠️ Partial | 25% | Worker-side rule engine |
| Phase 6: Recurring Templates | ⚠️ Partial | 25% | Scheduler worker, RRULE parser |
| Phase 7: Analytics Dashboard | ⚠️ Partial | 30% | Snapshot worker, Chart UIs |
| Phase 8: Testing & Hardening | ❌ Minimal | 5% | Tests, observability, backups |

### Completed Components ✅
| Component | Status | Location | Notes |
| --- | --- | --- | --- |
| Monorepo structure | ✅ | `/` | pnpm workspaces with apps/api, apps/worker, apps/web, packages/shared |
| TypeScript + ESLint + Prettier | ✅ | `/` | Project references configured |
| Basic CI pipeline | ✅ | `.github/workflows/ci.yml` | lint → test → build |
| Prisma schema (core) | ✅ | `prisma/schema.prisma` | User, Board, Column, Task, Project, Tag, TaskEvent, Rule, RecurringTemplate |
| Database migrations | ✅ | `prisma/migrations/` | Initial migration complete |
| Database seed script | ✅ | `prisma/seed.ts` | Demo user, GTD board, columns, tags, sample tasks, weekly review template |
| Docker Compose | ✅ | `docker/docker-compose.yml` | Full stack: Postgres, Redis, Mailhog, MinIO, API, Worker, Web |
| .env.example | ✅ | `.env.example` | All environment variables documented |
| Health check endpoints | ✅ | `apps/api/src/presentation/health.controller.ts` | `/health`, `/health/ready`, `/health/live` |
| Config validation | ✅ | `apps/api/src/shared/config.module.ts` | Joi schema for all env vars |
| User service | ✅ | `apps/api/src/modules/auth/` | Registration with board seeding |
| Board service | ✅ | `apps/api/src/modules/boards/` | CRUD, column management |
| Task service | ✅ | `apps/api/src/modules/tasks/` | CRUD, move with WIP, TaskEvent logging |
| Column service | ✅ | `apps/api/src/modules/boards/column.service.ts` | CRUD, reordering |
| WIP validation service | ✅ | `apps/api/src/modules/boards/wip.service.ts` | WIP limit checks |
| Project service | ✅ | `apps/api/src/modules/projects/` | CRUD operations |
| Capture service | ✅ | `apps/api/src/modules/capture/` | Quick-add with text parsing |
| Capture token guard | ✅ | `apps/api/src/guards/capture-token.guard.ts` | Header validation |
| Rate limiting | ✅ | `apps/api/src/modules/rate-limit/` | @nestjs/throttler integration |
| Tag service | ✅ | `apps/api/src/modules/tags/` | Board-scoped tag CRUD |
| Clarification service | ✅ | `apps/api/src/modules/clarification/` | GTD decision routing (API) |
| Checklist service | ✅ | `apps/api/src/modules/tasks/checklist.service.ts` | CRUD, reordering |
| Rule service (API) | ✅ | `apps/api/src/modules/rules/` | CRUD, validation, toggle, duplicate |
| Template service (API) | ✅ | `apps/api/src/modules/templates/` | CRUD, nextRunAt management |
| Analytics service (API) | ✅ | `apps/api/src/modules/analytics/` | CFD, throughput, lead/cycle, stale, WIP breaches |
| WebSocket gateway | ✅ | `apps/api/src/modules/realtime/` | Board rooms, broadcasts |
| IMAP poller | ✅ | `apps/worker/src/modules/integrations/imap.poller.ts` | Email capture to tasks |
| Kanban Board UI | ✅ | `apps/web/src/components/KanbanBoard.tsx` | Drag-and-drop with dnd-kit |
| TaskCard component | ✅ | `apps/web/src/components/TaskCard.tsx` | Draggable task cards |
| KanbanColumn component | ✅ | `apps/web/src/components/KanbanColumn.tsx` | Droppable columns with WIP indicator |
| FilterBar component | ✅ | `apps/web/src/components/FilterBar.tsx` | Context, project, stale filters |
| useTasks hook | ✅ | `apps/web/src/hooks/useTasks.ts` | Task state management with optimistic updates |
| Voice capture hook | ✅ | `apps/web/src/hooks/useVoiceCapture.ts` | Web Speech API with fallback |
| Offline queue | ✅ | `apps/web/src/hooks/useOfflineQueue.ts` | localStorage queue with flush |
| Basic service worker | ✅ | `apps/web/public/sw.js` | Basic caching |
| Browser extension | ✅ | `extensions/quick-capture/` | MV3, background script, options page |
| Dockerfiles | ✅ | `docker/` | Multi-stage builds for api, worker, web |

### Partial/In-Progress Components ⚠️
| Component | Status | Completion | What's Done | What's Missing |
| --- | --- | --- | --- | --- |
| Authentication | ⚠️ | 20% | Basic AuthModule, UserService | Session store, JWT, Passport.js, password hashing |
| GTD Clarification UI | ⚠️ | 0% | API complete | ClarificationWizard, step components, keyboard shortcuts |
| Someday/Waiting Views | ⚠️ | 0% | Data filters in API | Dedicated page components |
| Rule Engine (Worker) | ⚠️ | 0% | API CRUD complete | Trigger registry, condition evaluator, action executors, BullMQ processors |
| Scheduler Worker | ⚠️ | 0% | Template API complete | RRULE parser, scheduler polling, template executor |
| Analytics Worker | ⚠️ | 0% | Analytics API complete | Snapshot worker, metrics calculator |
| Analytics UI | ⚠️ | 0% | API endpoints ready | CFDChart, ThroughputChart, LeadCycleScatter, ReviewDashboard |
| PWA | ⚠️ | 30% | Basic SW, offline queue | manifest.json, enhanced caching, background sync |

### Not Yet Implemented ❌
| Component | Location | Workstream | Priority | Effort |
| --- | --- | --- | --- | --- |
| **Schema Additions** |
| Outbox model | `prisma/schema.prisma` | WS1 | Medium | 1h |
| RuleRun model | `prisma/schema.prisma` | WS5 | High | 1h |
| ColumnSnapshot model | `prisma/schema.prisma` | WS7 | Medium | 1h |
| TaskMetric model | `prisma/schema.prisma` | WS7 | Medium | 1h |
| Notification model | `prisma/schema.prisma` | WS8 | Medium | 1h |
| **Authentication** |
| Session store (Redis) | `apps/api/src/modules/auth/session.store.ts` | WS8 | Critical | 4h |
| JWT service | `apps/api/src/modules/auth/jwt.service.ts` | WS8 | Critical | 4h |
| Passport.js strategies | `apps/api/src/modules/auth/strategies/` | WS8 | Critical | 4h |
| Password service (Argon2) | `apps/api/src/modules/auth/password.service.ts` | WS8 | Critical | 2h |
| Auth guards (Session/JWT/Roles) | `apps/api/src/guards/` | WS8 | Critical | 3h |
| CSRF middleware | `apps/api/src/middleware/csrf.middleware.ts` | WS8 | High | 2h |
| **Worker Services** |
| Trigger registry | `apps/worker/src/modules/rules/triggers/trigger.registry.ts` | WS5 | High | 4h |
| Task triggers | `apps/worker/src/modules/rules/triggers/task.triggers.ts` | WS5 | High | 4h |
| Schedule triggers | `apps/worker/src/modules/rules/triggers/schedule.triggers.ts` | WS5 | High | 3h |
| Stale trigger | `apps/worker/src/modules/rules/triggers/stale.trigger.ts` | WS5 | Medium | 2h |
| Condition evaluator | `apps/worker/src/modules/rules/conditions/evaluator.ts` | WS5 | High | 6h |
| Action registry | `apps/worker/src/modules/rules/actions/action.registry.ts` | WS5 | High | 4h |
| Task actions | `apps/worker/src/modules/rules/actions/task.actions.ts` | WS5 | High | 4h |
| Notification actions | `apps/worker/src/modules/rules/actions/notification.actions.ts` | WS5 | Medium | 3h |
| Rule processor (BullMQ) | `apps/worker/src/modules/rules/rule.processor.ts` | WS5 | High | 4h |
| Idempotency service | `apps/worker/src/modules/rules/idempotency.service.ts` | WS5 | Medium | 3h |
| RRULE parser | `apps/worker/src/modules/scheduler/rrule.parser.ts` | WS6 | High | 3h |
| Scheduler worker | `apps/worker/src/modules/scheduler/scheduler.worker.ts` | WS6 | High | 4h |
| Template executor | `apps/worker/src/modules/scheduler/template.executor.ts` | WS6 | High | 3h |
| Snapshot worker | `apps/worker/src/modules/analytics/snapshot.worker.ts` | WS7 | Medium | 4h |
| Metrics calculator | `apps/worker/src/modules/analytics/metrics.calculator.ts` | WS7 | Medium | 4h |
| Email service (Nodemailer) | `apps/worker/src/modules/notifications/email.service.ts` | WS6 | Medium | 3h |
| Outbox publisher | `apps/api/src/modules/events/outbox.service.ts` | WS1 | Medium | 4h |
| **Frontend Components** |
| ClarificationWizard | `apps/web/src/components/ClarificationWizard.tsx` | WS4 | High | 8h |
| Wizard step components | `apps/web/src/components/wizard/` | WS4 | High | 6h |
| useKeyboardShortcuts hook | `apps/web/src/hooks/useKeyboardShortcuts.ts` | WS4 | Medium | 3h |
| SomedayView | `apps/web/src/pages/SomedayView.tsx` | WS4 | Medium | 4h |
| WaitingView | `apps/web/src/pages/WaitingView.tsx` | WS4 | Medium | 4h |
| StaleView | `apps/web/src/pages/StaleView.tsx` | WS4 | Medium | 3h |
| RuleBuilder UI | `apps/web/src/components/RuleBuilder.tsx` | WS5 | High | 8h |
| TemplateBuilder UI | `apps/web/src/components/TemplateBuilder.tsx` | WS6 | Medium | 6h |
| RRulePicker | `apps/web/src/components/RRulePicker.tsx` | WS6 | Medium | 4h |
| CFDChart | `apps/web/src/components/charts/CFDChart.tsx` | WS7 | Medium | 4h |
| ThroughputChart | `apps/web/src/components/charts/ThroughputChart.tsx` | WS7 | Medium | 3h |
| LeadCycleScatter | `apps/web/src/components/charts/LeadCycleScatter.tsx` | WS7 | Medium | 4h |
| ReviewDashboard | `apps/web/src/pages/ReviewDashboard.tsx` | WS7 | Medium | 6h |
| AgingWipBadge | `apps/web/src/components/AgingWipBadge.tsx` | WS7 | Low | 2h |
| PWA manifest | `apps/web/public/manifest.json` | WS3 | Medium | 1h |
| Enhanced service worker | `apps/web/public/sw.js` | WS3 | Medium | 4h |
| **Testing** |
| Unit tests (services) | `apps/api/src/modules/*/__tests__/` | Testing | High | 12h |
| Unit tests (worker) | `apps/worker/src/modules/*/__tests__/` | Testing | High | 8h |
| Integration tests | `tests/integration/` | Testing | High | 8h |
| E2E tests (Playwright) | `tests/e2e/` | Testing | Medium | 8h |
| k6 load tests | `tests/load/` | Testing | Low | 4h |
| **Observability** |
| OpenTelemetry setup | `apps/api/src/telemetry/` | WS8 | Medium | 4h |
| Prometheus metrics | `apps/api/src/metrics/` | WS8 | Medium | 4h |
| Structured logging | `apps/api/src/logging/` | WS8 | Medium | 3h |
| **Operations** |
| Backup scripts | `scripts/backup.sh` | WS8 | Medium | 3h |
| Restore scripts | `scripts/restore.sh` | WS8 | Medium | 2h |
| Security scan CI | `.github/workflows/security.yml` | WS8 | Medium | 2h |

---

## 3. Workstreams & Deliverables

### WS0 – Environment & Foundations (Week 1)
- Scaffold monorepo (pnpm/workspaces) with `apps/api`, `apps/worker`, `apps/web`, `packages/shared`.
- Configure TypeScript project references, linting, prettier, basic CI (lint + test).
- Stand up Docker Compose: Postgres, Redis, Mailhog, MinIO (optional), API, worker, web.
- Implement health checks, config management, and secret handling (dotenv + validation).

#### WS0 Detailed Tasks (Gap Fill)
| Task | File/Location | Specification |
| --- | --- | --- |
| Create docker-compose.yml | `/docker/docker-compose.yml` | Services: postgres:14, redis:7, mailhog, minio (optional), api, worker, web; volumes for data persistence; network isolation |
| Create .env.example | `/.env.example` | All environment variables with defaults and documentation |
| Health check endpoint | `/apps/api/src/presentation/health.controller.ts` | Add `/health/ready` (checks DB + Redis) and `/health/live` (always 200) |
| Config validation schema | `/apps/api/src/shared/config.schema.ts` | Joi schema validating: DATABASE_URL, REDIS_URL, API_PORT, CAPTURE_ACCESS_TOKEN, CORS_ORIGIN |
| Worker health check | `/apps/worker/src/health.ts` | Redis connection check, BullMQ queue status |

```yaml
# docker-compose.yml structure
services:
  postgres:
    image: postgres:14-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment: [POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB]
    healthcheck: pg_isready
  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
    healthcheck: redis-cli ping
  api:
    build: {context: .., dockerfile: docker/Dockerfile.api}
    depends_on: [postgres, redis]
    ports: ["3000:3000"]
    env_file: .env
  worker:
    build: {context: .., dockerfile: docker/Dockerfile.worker}
    depends_on: [postgres, redis]
    env_file: .env
  web:
    build: {context: .., dockerfile: docker/Dockerfile.web}
    ports: ["5173:80"]
```

### WS1 – Core Domain & Persistence (Weeks 1–2)
- Define schema for users, boards, columns, tasks, projects, tags, task events, rules, recurring templates.
- Implement Prisma/TypeORM migrations, repositories, and domain services (TaskService, BoardService, ProjectService).
- Add transactional outbox pattern for TaskEvents (table + publisher service) and seed initial columns/wip limits.

#### WS1 Detailed Tasks (Gap Fill)
| Task | File/Location | Specification |
| --- | --- | --- |
| Add Outbox table | `/prisma/schema.prisma` | `model Outbox { id, aggregateType, aggregateId, eventType, payload, createdAt, processedAt }` |
| Outbox publisher service | `/apps/api/src/modules/events/outbox.service.ts` | Poll unprocessed entries, publish to Redis/BullMQ, mark processed |
| Column seeding | `/prisma/seed.ts` | Default columns: Input, Next Actions, In Progress (WIP:3), Waiting, Someday, Done, Archive |
| TaskEvent enhancement | `/apps/api/src/modules/tasks/task.service.ts` | Record fromColumnId on moves, add MOVED event type distinction |

```typescript
// Outbox schema addition
model Outbox {
  id            String   @id @default(uuid()) @db.Uuid
  aggregateType String   // "Task", "Rule", etc.
  aggregateId   String   @db.Uuid
  eventType     String   // "task.created", "task.moved", etc.
  payload       Json
  createdAt     DateTime @default(now())
  processedAt   DateTime?
  @@index([processedAt])
}
```

### WS2 – Board API & UI (Weeks 2–4)
- REST/GraphQL endpoints for boards, columns, tasks, drag/drop move operations with validation + WIP limit rules.
- WebSocket gateway broadcasting TaskEvents per board via Redis pub/sub.
- React board view with drag/drop (dnd-kit), column configuration, WIP indicators, context filters, project filters, Inbox-only view.

#### WS2 Detailed Tasks (Gap Fill)
| Task | File/Location | Specification |
| --- | --- | --- |
| Task move endpoint | `/apps/api/src/modules/tasks/task.controller.ts` | `POST /tasks/:id/move` with { columnId, position? }; validates WIP limits |
| WIP validation service | `/apps/api/src/modules/boards/wip.service.ts` | Check column task count vs wipLimit; return { allowed, currentCount, limit } |
| Column CRUD endpoints | `/apps/api/src/modules/boards/column.controller.ts` | GET/POST/PATCH/DELETE for columns; reorder endpoint |
| Tag CRUD endpoints | `/apps/api/src/modules/tags/tag.controller.ts` | Board-scoped tag management |
| Board UI component | `/apps/web/src/components/Board.tsx` | Full Kanban view with columns |
| Column component | `/apps/web/src/components/Column.tsx` | Droppable zone with WIP indicator |
| TaskCard component | `/apps/web/src/components/TaskCard.tsx` | Draggable card with context badge, due date, project |
| Install dnd-kit | `/apps/web/package.json` | Add @dnd-kit/core, @dnd-kit/sortable |
| Context filter bar | `/apps/web/src/components/FilterBar.tsx` | Toggle buttons for EMAIL, MEETING, PHONE, etc. |
| Project filter dropdown | `/apps/web/src/components/ProjectFilter.tsx` | Dropdown to filter tasks by project |

```typescript
// Move endpoint specification
@Post('tasks/:id/move')
async moveTask(
  @Param('id') id: string,
  @Body() dto: MoveTaskDto
): Promise<{ task: Task; wipStatus: WipStatus }> {
  // 1. Validate target column exists
  // 2. Check WIP limit (warn or block based on board config)
  // 3. Update task.columnId, task.lastMovedAt
  // 4. Create TaskEvent with type=MOVED, fromColumnId, toColumnId
  // 5. Emit WebSocket board:update
  // 6. Return updated task with WIP status
}
```

### WS3 – Capture Pipeline (Weeks 4–6)
- Quick-add endpoint + UI (text + optional voice capture using Web Speech API; fallback when unavailable).
- PWA enhancements (service worker, offline queue for captures).
- WebExtension MVP hitting signed webhook endpoint (token scoped per device, rate limited).
- IMAP poller worker using `imapflow`: fetch unseen mail, persist raw message (S3/MinIO), create Input queue tasks with email metadata.

#### WS3 Detailed Tasks (Gap Fill)
| Task | File/Location | Specification |
| --- | --- | --- |
| Capture auth guard | `/apps/api/src/guards/capture-token.guard.ts` | Validate `x-capture-token` header against CAPTURE_ACCESS_TOKEN env |
| Rate limit middleware | `/apps/api/src/middleware/rate-limit.middleware.ts` | Use `@nestjs/throttler` with configurable limits (default: 60/min) |
| PWA manifest | `/apps/web/public/manifest.json` | name, icons, start_url, display: standalone, theme_color |
| Enhanced service worker | `/apps/web/public/sw.js` | Precache core assets, runtime caching for API, background sync for captures |
| Extension settings storage | `/extensions/quick-capture/background.js` | Secure token storage with chrome.storage.local |
| IMAP error handling | `/apps/worker/src/modules/integrations/imap.poller.ts` | Exponential backoff (1s→2s→4s→max 5min), reconnection logic |
| Email attachment storage | `/apps/worker/src/modules/integrations/attachment.service.ts` | S3/MinIO upload for attachments > 10KB |

```typescript
// Capture guard implementation
@Injectable()
export class CaptureTokenGuard implements CanActivate {
  constructor(private config: ConfigService) {}
  
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-capture-token'];
    const expected = this.config.get('CAPTURE_ACCESS_TOKEN');
    if (!expected) return true; // Token not configured = open
    return token === expected;
  }
}
```

### WS4 – Clarification & GTD Wizard (Weeks 5–7)
- Clarification mode API: fetch single unclarified task, step-by-step decisions (actionable, two-minute, next action entry, context, project, waiting-for, due date, breakdown flag).
- UI wizard with keyboard shortcuts + metrics on throughput.
- Someday/Waiting dedicated views and checklist support in tasks.

#### WS4 Detailed Tasks (Gap Fill)
| Task | File/Location | Specification |
| --- | --- | --- |
| Clarification service | `/apps/api/src/modules/clarification/clarification.service.ts` | `getNextUnclarified(boardId)`, `clarifyTask(id, decisions)` |
| Clarification controller | `/apps/api/src/modules/clarification/clarification.controller.ts` | GET /boards/:id/clarify/next, POST /tasks/:id/clarify |
| Clarification module | `/apps/api/src/modules/clarification/clarification.module.ts` | Register service and controller |
| Clarification DTOs | `/apps/api/src/modules/clarification/dto/` | `ClarifyTaskDto { actionable, twoMinute, nextAction, context, projectId, waitingFor, dueAt, needsBreakdown, targetColumn }` |
| Checklist CRUD | `/apps/api/src/modules/tasks/checklist.controller.ts` | POST /tasks/:id/checklist, PATCH /checklist/:id, DELETE /checklist/:id |
| Wizard component | `/apps/web/src/components/ClarificationWizard.tsx` | Multi-step modal with keyboard navigation |
| Wizard step components | `/apps/web/src/components/wizard/` | ActionableStep, TwoMinuteStep, NextActionStep, ContextStep, etc. |
| Someday view | `/apps/web/src/pages/SomedayView.tsx` | List tasks in SOMEDAY columns with review actions |
| Waiting view | `/apps/web/src/pages/WaitingView.tsx` | List tasks with waitingFor set, grouped by contact |
| Stale tasks view | `/apps/web/src/pages/StaleView.tsx` | Tasks with lastMovedAt > 7 days |
| useKeyboardShortcuts hook | `/apps/web/src/hooks/useKeyboardShortcuts.ts` | y/n for actionable, 1-5 for context selection, Enter to proceed |

```typescript
// Clarification flow specification
interface ClarifyTaskDto {
  actionable: boolean;        // Step 1: Is this actionable?
  twoMinute?: boolean;        // Step 2: Can it be done in <2 min?
  nextAction?: string;        // Step 3: What's the next physical action?
  context?: TaskContext;      // Step 4: Which context? (EMAIL, PHONE, etc.)
  projectId?: string;         // Step 5: Link to project?
  waitingFor?: string;        // Step 6: Waiting on someone?
  dueAt?: Date;              // Step 7: Due date?
  needsBreakdown?: boolean;   // Step 8: Needs breakdown into subtasks?
  targetColumn?: string;      // Computed: Where should this go?
}

// Clarification service logic
async clarifyTask(id: string, dto: ClarifyTaskDto) {
  // Decision tree:
  // - Not actionable + reference → Archive
  // - Not actionable + someday → Someday column
  // - Not actionable + trash → Delete or Won't Do
  // - Actionable + <2min → Done Immediately (do now)
  // - Actionable + waiting → Waiting column + set waitingFor
  // - Actionable + has context → Context column
  // - Default → Next Actions column
}
```

### WS5 – Automation Engine (Weeks 7–9)
- Rule entity CRUD, JSON schema validation, versioning, and audit logs.
- Trigger adapters for task.created/moved/completed, stale-detected, email.received, schedule tick.
- Condition evaluator (field filters, tag/project checks, age/due windows) with deterministic ordering.
- Action executors (create/update/move task, checklist management, notifications, email archive hook) with idempotency + retries.
- Worker processors for event-driven rules (`rules:triggered`) and scheduled jobs (`rules:scheduled`).

#### WS5 Detailed Tasks (Gap Fill)
| Task | File/Location | Specification |
| --- | --- | --- |
| Rule service | `/apps/api/src/modules/rules/rule.service.ts` | CRUD operations, validation, enable/disable |
| Rule controller | `/apps/api/src/modules/rules/rule.controller.ts` | GET/POST/PATCH/DELETE endpoints |
| Rule run model | `/prisma/schema.prisma` | `model RuleRun { id, ruleId, eventId, status, startedAt, finishedAt, error, logs }` |
| Trigger registry | `/apps/worker/src/modules/rules/triggers/trigger.registry.ts` | Map trigger types to adapters |
| Task triggers | `/apps/worker/src/modules/rules/triggers/task.triggers.ts` | task.created, task.moved, task.completed handlers |
| Schedule triggers | `/apps/worker/src/modules/rules/triggers/schedule.triggers.ts` | Cron/RRULE evaluation |
| Stale trigger | `/apps/worker/src/modules/rules/triggers/stale.trigger.ts` | Detect tasks with lastMovedAt > threshold |
| Condition evaluator | `/apps/worker/src/modules/rules/conditions/evaluator.ts` | Parse and evaluate condition JSON |
| Field conditions | `/apps/worker/src/modules/rules/conditions/field.conditions.ts` | equals, contains, gt, lt, in, between |
| Tag/project conditions | `/apps/worker/src/modules/rules/conditions/relation.conditions.ts` | hasTag, hasProject, inColumn |
| Action registry | `/apps/worker/src/modules/rules/actions/action.registry.ts` | Map action types to executors |
| Task actions | `/apps/worker/src/modules/rules/actions/task.actions.ts` | createTask, updateTask, moveTask, completeTask |
| Notification actions | `/apps/worker/src/modules/rules/actions/notification.actions.ts` | sendEmail, inAppNotify |
| Rule processor | `/apps/worker/src/modules/rules/rule.processor.ts` | BullMQ processor for rules:triggered queue |
| Idempotency service | `/apps/worker/src/modules/rules/idempotency.service.ts` | Track rule runs by eventId + ruleId combo |
| Rule builder UI | `/apps/web/src/components/RuleBuilder.tsx` | Visual rule creation interface |

```typescript
// Rule JSON schema specification
interface RuleDefinition {
  trigger: {
    type: 'task.created' | 'task.moved' | 'task.completed' | 'stale' | 'schedule' | 'email.received';
    config?: {
      schedule?: string;      // cron or RRULE for schedule trigger
      staleThreshold?: number; // days for stale trigger
      fromColumn?: string;    // for task.moved
      toColumn?: string;      // for task.moved
    };
  };
  conditions: Array<{
    field: string;           // 'title', 'context', 'tags', 'project', 'age', 'dueIn'
    operator: 'eq' | 'ne' | 'contains' | 'in' | 'gt' | 'lt' | 'between';
    value: unknown;
  }>;
  actions: Array<{
    type: 'createTask' | 'updateTask' | 'moveTask' | 'addTag' | 'addChecklist' | 'notify' | 'stop';
    config: Record<string, unknown>;
  }>;
}

// BullMQ queue setup
// Queue: rules:triggered - event-driven rule evaluation
// Queue: rules:scheduled - cron-based rule checks
// Queue: rules:stale - periodic stale detection scan
```

### WS6 – Recurring Templates & Scheduler (Weeks 9–10)
- Template builder UI (payload editor, RRULE/cron config, timezone).
- Scheduler worker computing `next_run_at`, enqueuing template execution, handling skips/dismissals.
- Weekly review template seeded with checklist + analytics links; optional email reminder via SMTP.

#### WS6 Detailed Tasks (Gap Fill)
| Task | File/Location | Specification |
| --- | --- | --- |
| Template service | `/apps/api/src/modules/templates/template.service.ts` | CRUD, activate/deactivate, compute nextRunAt |
| Template controller | `/apps/api/src/modules/templates/template.controller.ts` | GET/POST/PATCH/DELETE endpoints |
| RRULE parser | `/apps/worker/src/modules/scheduler/rrule.parser.ts` | Use `rrule` package to parse and compute next occurrence |
| Scheduler worker | `/apps/worker/src/modules/scheduler/scheduler.worker.ts` | Poll templates where nextRunAt <= now, enqueue creation |
| Template executor | `/apps/worker/src/modules/scheduler/template.executor.ts` | Create task from template payload, update nextRunAt |
| Skip/dismiss API | `/apps/api/src/modules/templates/template.controller.ts` | POST /templates/:id/skip, POST /templates/:id/dismiss |
| Weekly review seed | `/prisma/seed.ts` | Create "Weekly Review" template with checklist items |
| SMTP notification | `/apps/worker/src/modules/notifications/email.service.ts` | Nodemailer integration for reminder emails |
| Template builder UI | `/apps/web/src/components/TemplateBuilder.tsx` | Form for payload, schedule, timezone |
| RRULE picker | `/apps/web/src/components/RRulePicker.tsx` | Visual recurrence rule builder |

```typescript
// Weekly review template seed
const weeklyReviewTemplate = {
  name: 'Weekly Review',
  description: 'GTD weekly review checklist',
  payload: {
    title: 'Weekly Review - {{date}}',
    needsBreakdown: false,
    checklist: [
      { title: 'Clear inbox to zero', isDone: false },
      { title: 'Review calendar (past week)', isDone: false },
      { title: 'Review calendar (upcoming week)', isDone: false },
      { title: 'Review Waiting For list', isDone: false },
      { title: 'Review Someday/Maybe list', isDone: false },
      { title: 'Review project list', isDone: false },
      { title: 'Review stale tasks', isDone: false },
      { title: 'Mind sweep - capture new items', isDone: false },
    ],
    metadata: {
      analyticsUrl: '/analytics/weekly',
      staleTasksUrl: '/views/stale',
    }
  },
  rrule: 'FREQ=WEEKLY;BYDAY=FR;BYHOUR=9',
  timezone: 'America/New_York',
};
```

### WS7 – Analytics & Review Surfaces (Weeks 10–12)
- TaskEvent ingestion into snapshots (hourly/daily column counts) + lead/cycle calculations.
- API endpoints feeding CFD, lead/cycle scatter, aging WIP, stale-task list.
- Weekly review dashboard referencing analytics, stale tasks, WIP breaches, Someday/Waiting review flows.

#### WS7 Detailed Tasks (Gap Fill)
| Task | File/Location | Specification |
| --- | --- | --- |
| ColumnSnapshot model | `/prisma/schema.prisma` | `model ColumnSnapshot { id, boardId, columnId, timestamp, taskCount, wipBreached }` |
| TaskMetric model | `/prisma/schema.prisma` | `model TaskMetric { id, taskId, leadTime, cycleTime, completedAt }` |
| Snapshot worker | `/apps/worker/src/modules/analytics/snapshot.worker.ts` | Hourly job: count tasks per column, store snapshots |
| Metrics calculator | `/apps/worker/src/modules/analytics/metrics.calculator.ts` | On task complete: calculate lead time (created→done), cycle time (first work column→done) |
| Analytics service | `/apps/api/src/modules/analytics/analytics.service.ts` | Query snapshots, aggregate metrics |
| Analytics controller | `/apps/api/src/modules/analytics/analytics.controller.ts` | GET /analytics/cfd, /analytics/throughput, /analytics/lead-time |
| CFD endpoint | `/apps/api/src/modules/analytics/analytics.controller.ts` | Return time-series data for cumulative flow diagram |
| Stale tasks endpoint | `/apps/api/src/modules/analytics/analytics.controller.ts` | GET /analytics/stale - tasks with lastMovedAt > threshold |
| WIP breach history | `/apps/api/src/modules/analytics/analytics.controller.ts` | GET /analytics/wip-breaches - timeline of limit violations |
| CFD chart component | `/apps/web/src/components/charts/CFDChart.tsx` | Area chart using recharts or chart.js |
| Lead/cycle scatter | `/apps/web/src/components/charts/LeadCycleScatter.tsx` | Scatter plot of lead vs cycle times |
| Throughput chart | `/apps/web/src/components/charts/ThroughputChart.tsx` | Bar chart of weekly completions |
| Review dashboard page | `/apps/web/src/pages/ReviewDashboard.tsx` | Combined view: metrics, stale list, action items |
| Aging WIP indicator | `/apps/web/src/components/AgingWipBadge.tsx` | Color-coded age indicator on task cards |

```typescript
// Analytics API specification
interface CFDDataPoint {
  timestamp: Date;
  columns: Record<string, number>; // columnId → task count
}

interface ThroughputData {
  period: string;        // '2024-W01', '2024-01-15'
  completed: number;
  created: number;
}

interface LeadCycleMetric {
  taskId: string;
  title: string;
  leadTimeDays: number;  // created → completed
  cycleTimeDays: number; // first work column → completed
  completedAt: Date;
}
```

### WS8 – DevOps, Security, Hardening (Weeks 12–13)
- Authentication (session + JWT for extensions), CSRF protection, rate limiting, RBAC hooks.
- Observability: OpenTelemetry tracing, Prometheus metrics (queue lag, rule failures), structured logging.
- Backup strategy (Postgres dumps, Redis snapshot policy), disaster recovery scripts.
- Load/perf tests on board interactions and automation throughput; docs for deployment, environment variables, upgrade path.

#### WS8 Detailed Tasks (Gap Fill)
| Task | File/Location | Specification |
| --- | --- | --- |
| Auth module | `/apps/api/src/modules/auth/` | Passport.js with local + JWT strategies |
| Session store | `/apps/api/src/modules/auth/session.store.ts` | Redis-backed session storage |
| JWT service | `/apps/api/src/modules/auth/jwt.service.ts` | Issue, verify, refresh tokens |
| Auth guards | `/apps/api/src/guards/` | SessionGuard, JwtGuard, RolesGuard |
| Password hashing | `/apps/api/src/modules/auth/password.service.ts` | Argon2 hashing |
| CSRF middleware | `/apps/api/src/middleware/csrf.middleware.ts` | csurf integration for browser requests |
| Rate limiter | `/apps/api/src/modules/rate-limit/` | @nestjs/throttler with Redis store |
| RBAC decorator | `/apps/api/src/decorators/roles.decorator.ts` | @Roles('owner', 'viewer') decorator |
| OpenTelemetry setup | `/apps/api/src/telemetry/tracing.ts` | OTLP exporter configuration |
| Prometheus metrics | `/apps/api/src/metrics/prometheus.module.ts` | prom-client with custom metrics |
| Custom metrics | `/apps/api/src/metrics/custom.metrics.ts` | api_requests_total, queue_depth, rule_executions |
| Structured logging | `/apps/api/src/logging/logger.service.ts` | Winston/Pino with JSON format, correlation IDs |
| Backup script | `/scripts/backup.sh` | pg_dump, redis-cli BGSAVE, S3 upload |
| Restore script | `/scripts/restore.sh` | Download from S3, pg_restore, redis-cli restore |
| k6 load tests | `/tests/load/board.k6.js` | Simulate board operations under load |
| k6 automation tests | `/tests/load/automation.k6.js` | Simulate rule triggers at scale |
| Security scan CI | `/.github/workflows/security.yml` | npm audit, Snyk, OWASP ZAP baseline |

```typescript
// Auth configuration specification
interface AuthConfig {
  session: {
    secret: string;
    maxAge: number;        // 24h default
    store: 'redis';
  };
  jwt: {
    secret: string;
    accessExpiry: string;  // '15m'
    refreshExpiry: string; // '7d'
  };
  rateLimit: {
    ttl: number;           // 60 seconds
    limit: number;         // 100 requests
    captureLimit: number;  // 60 requests (separate limit)
  };
}

// Prometheus metrics
const metrics = {
  httpRequestsTotal: new Counter({ name: 'http_requests_total', labelNames: ['method', 'path', 'status'] }),
  httpRequestDuration: new Histogram({ name: 'http_request_duration_seconds', labelNames: ['method', 'path'] }),
  bullmqQueueDepth: new Gauge({ name: 'bullmq_queue_depth', labelNames: ['queue'] }),
  ruleExecutionsTotal: new Counter({ name: 'rule_executions_total', labelNames: ['rule_id', 'status'] }),
  tasksCreatedTotal: new Counter({ name: 'tasks_created_total', labelNames: ['source'] }),
};
```

## 4. Milestones & Timeline (Indicative)
| Week | Milestone | Key Deliverables |
| --- | --- | --- |
| 1 | Foundation Ready | Monorepo + infra stack running locally |
| 3 | Kanban MVP | Core schema, board CRUD, drag/drop UI, realtime updates |
| 6 | Capture Complete | Web/PWA capture, extension webhook, IMAP ingestion |
| 8 | GTD Flow Ready | Clarification wizard, Someday/Waiting views, checklists |
| 9 | Automation Alpha | Rule engine MVP with event triggers + actions |
| 10 | Scheduling Live | Recurring templates + scheduler worker |
| 12 | Analytics Dashboard | CFD, lead/cycle metrics, stale review |
| 13 | Production Hardened | Auth, observability, backups, deployment docs |

## 5. Risks & Mitigations
- **Complex rule chains causing loops** → add rule priorities, "stop further rules" switch, loop detection with run idempotency keys.
- **IMAP variability** → configurable polling intervals, exponential backoff, message duplication safeguards via UID checks.
- **Queue overload** → monitor BullMQ queue depth, autoscale workers, enforce rule quotas per board.
- **Data model evolution** → use explicit migrations and backwards-compatible API versioning.
- **Offline capture conflicts** → client-side temp IDs reconciled server-side with dedupe tokens.

## 6. Success Criteria
- End-to-end flow: capture → clarify → organized contexts → automation firing → recurring tasks → analytics-driven review.
- Less than 5% failed jobs in BullMQ under normal load.
- Weekly review task auto-generated with analytics links and stale list each Friday.
- Deployment reproducible via single `docker compose up` and documented environment variables.

## 7. Quality & Testing Strategy
- **Unit tests**: minimum 80% coverage on domain services, rule evaluators, schedulers (Jest). Each Nest module ships with factories/mocks in `packages/testing`.
- **Integration tests**: spin Postgres/Redis via Testcontainers; verify board moves, rule execution, IMAP ingestion, recurring scheduler.
- **End-to-end tests**: Playwright suite covering capture → clarify → done flows, automation, analytics dashboards.
- **Load & soak tests**: k6 scripts simulating board interactions + 1k automation events/hour; queue lag alarms when p95 > 5s.
- **Security tests**: dependency scanning (npm audit + Snyk), OWASP zap baseline, auth/ZAP for CSRF and rate limits.
- **Acceptance gates**: each milestone requires demo + passing regression suite before next workstream begins.

### 7A. Detailed Testing Specifications (Gap Fill)

#### Unit Test Coverage Requirements
| Module | Coverage Target | Key Test Cases |
| --- | --- | --- |
| TaskService | 90% | create with tags/checklist, update with column change, TaskEvent creation |
| BoardService | 85% | CRUD operations, column ordering |
| CaptureService | 85% | text parsing, URL extraction, column resolution |
| ClarificationService | 90% | all GTD decision paths, column routing |
| RuleService | 90% | CRUD, enable/disable, validation |
| ConditionEvaluator | 95% | all operators, edge cases (null values, missing fields) |
| ActionExecutor | 90% | all action types, idempotency |
| TemplateService | 85% | RRULE parsing, next run calculation |
| AnalyticsService | 85% | CFD aggregation, lead/cycle calculation |

#### Test File Structure
```
/apps/api/src/modules/
├── tasks/
│   ├── __tests__/
│   │   ├── task.service.spec.ts
│   │   ├── task.controller.spec.ts
│   │   └── fixtures/
│   │       └── task.fixtures.ts
├── boards/
│   ├── __tests__/
│   │   ├── board.service.spec.ts
│   │   ├── wip.service.spec.ts
│   │   └── column.controller.spec.ts
...

/apps/worker/src/modules/
├── rules/
│   ├── __tests__/
│   │   ├── condition-evaluator.spec.ts
│   │   ├── action-executor.spec.ts
│   │   ├── rule.processor.spec.ts
│   │   └── triggers/
│   │       ├── task.triggers.spec.ts
│   │       └── schedule.triggers.spec.ts
...

/tests/
├── integration/
│   ├── board-workflow.spec.ts
│   ├── capture-flow.spec.ts
│   ├── rule-execution.spec.ts
│   └── testcontainers.setup.ts
├── e2e/
│   ├── playwright.config.ts
│   ├── capture-to-done.spec.ts
│   ├── clarification-wizard.spec.ts
│   ├── automation-rules.spec.ts
│   └── weekly-review.spec.ts
├── load/
│   ├── board.k6.js
│   ├── automation.k6.js
│   └── capture.k6.js
```

#### Integration Test Scenarios
```typescript
// tests/integration/board-workflow.spec.ts
describe('Board Workflow', () => {
  // Setup: Start Testcontainers for Postgres + Redis
  
  it('should create task and emit WebSocket event', async () => {});
  it('should move task and enforce WIP limits', async () => {});
  it('should create TaskEvent on move with fromColumn/toColumn', async () => {});
  it('should broadcast board:update via WebSocket', async () => {});
});

// tests/integration/rule-execution.spec.ts
describe('Rule Execution', () => {
  it('should trigger rule on task.created event', async () => {});
  it('should evaluate all conditions correctly', async () => {});
  it('should execute actions in order', async () => {});
  it('should prevent duplicate execution via idempotency', async () => {});
  it('should stop propagation when action.stop is encountered', async () => {});
});
```

#### E2E Test Scenarios (Playwright)
```typescript
// tests/e2e/capture-to-done.spec.ts
test.describe('Capture to Done Flow', () => {
  test('capture via quick-add → clarify → context lane → complete', async ({ page }) => {
    // 1. Login/select owner
    // 2. Open capture form
    // 3. Enter task text
    // 4. Submit and verify in Input column
    // 5. Open clarification wizard
    // 6. Answer: actionable=yes, context=DESK
    // 7. Verify task moved to Desk context column
    // 8. Drag to Done column
    // 9. Verify completion timestamp
  });
  
  test('offline capture → sync → visible on board', async ({ page, context }) => {
    // 1. Simulate offline via context.setOffline(true)
    // 2. Submit capture
    // 3. Verify queued indicator
    // 4. Restore online
    // 5. Verify sync and task appearance
  });
});
```

#### Load Test Specifications (k6)
```javascript
// tests/load/board.k6.js
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '5m', target: 50 },   // Steady state
    { duration: '1m', target: 100 },  // Spike
    { duration: '5m', target: 100 },  // High load
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p95<300'],    // 95% under 300ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failure
  },
};

export default function() {
  // Simulate: list boards, get tasks, move task, create task
}
```

## 8. Deployment & Ops Plan
- **Environments**: local (Docker Compose), staging (single VM), production (HA pair). Config via `.env` + Secrets Manager; migrations run through CI job.
- **CI/CD**: GitHub Actions pipeline (lint → test → build → docker image → helm/compose deploy). Tag-based releases, semantic versioning.
- **Observability**: OpenTelemetry exporters -> OTLP collector -> Prometheus/Grafana; alerting for queue depth, API latency, IMAP failures, disk usage.
- **Backup/restore**: nightly Postgres dumps + WAL archiving, Redis snapshot every 30 min, object storage replication for captured emails.
- **Runbooks**: incident procedures for queue backlog, IMAP auth errors, failed rule job, stale scheduler.

## 9. Documentation Deliverables
- **Architecture overview** (C4, data flows) updated per release.
- **API reference** with OpenAPI schema + SDK generation (shared package consumed by web/extension).
- **Operations guide**: provisioning steps, environment variables, TLS/SMTP/IMAP configuration, backup scripts.
- **User guides**: capture workflows, clarification wizard, automation builder, analytics interpretation, weekly review checklist.
- **Extension guide**: installation, token management, permission rationale.

## 10. Resource & Responsibility Matrix
| Role | Primary Scope | Key Outputs |
| --- | --- | --- |
| Tech Lead | Overall architecture, backlog orchestration, code reviews | ADRs, design approvals, release readiness |
| Backend Engineer(s) | Nest services, data model, rules engine, workers | APIs, migrations, automation, scheduler |
| Frontend Engineer(s) | React/PWA, board UX, wizard, analytics dashboards | SPA, extension, UI tests |
| DevOps/Infra | CI/CD, observability, deployment hardening | Pipelines, monitoring, runbooks |
| QA Engineer | Test plans, automation, release validation | Regression suites, test reports |

## 11. Open Questions & Dependencies
- Do we require multi-user permissions in v1 or is single-owner sufficient? (affects auth + sharing).
- Storage location for captured email bodies—local disk vs external object store? (cost + compliance).
- Will mobile capture need native wrappers beyond PWA? (impact on roadmap).
- Are analytics retention requirements defined (e.g., 12 months vs indefinite)?
- Confirm timezone handling expectations for recurring templates across daylight saving changes.

---

## 12. Priority Execution Roadmap (Revised Gap Analysis)

Based on the **current implementation status**, the following roadmap addresses the remaining gaps. Phases 1-2 are **COMPLETE** and have been moved to the "Completed Phases" section.

---

### Completed Phases ✅

#### Phase 1: Infrastructure Completion ✅ COMPLETE
All tasks completed: Docker Compose, .env.example, health checks, config validation, Prisma seed.

#### Phase 2: Core Board UI ✅ COMPLETE
All tasks completed: dnd-kit, KanbanBoard, KanbanColumn, TaskCard, FilterBar, move endpoint with WIP, column CRUD.

---

### Remaining Phases

### Phase 3: Security & Authentication (Days 1-7) 🔴 Critical
**Objective**: Protect API with proper authentication and CSRF protection.
**Current Status**: 40% complete (capture token guard and rate limiting done).

| Priority | Task | Effort | Status | Dependencies |
| --- | --- | --- | --- | --- |
| ✅ | Capture token guard | 2h | Done | — |
| ✅ | Rate limiting middleware | 3h | Done | — |
| P0 | Password service (Argon2) | 2h | TODO | None |
| P0 | Passport.js local strategy | 4h | TODO | Password service |
| P0 | Session store (Redis) | 4h | TODO | Redis, Passport |
| P0 | JWT service | 4h | TODO | None |
| P0 | JWT strategy (extensions) | 2h | TODO | JWT service |
| P0 | Auth guards (Session/JWT) | 3h | TODO | Strategies |
| P1 | CSRF middleware | 2h | TODO | Session auth |
| P1 | Login/logout API | 2h | TODO | Auth guards |
| P1 | Roles/RBAC decorator | 2h | TODO | Auth guards |

**Deliverables**:
- `apps/api/src/modules/auth/password.service.ts`
- `apps/api/src/modules/auth/jwt.service.ts`
- `apps/api/src/modules/auth/strategies/local.strategy.ts`
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/api/src/modules/auth/session.store.ts`
- `apps/api/src/guards/session.guard.ts`
- `apps/api/src/guards/jwt.guard.ts`
- `apps/api/src/guards/roles.guard.ts`
- `apps/api/src/middleware/csrf.middleware.ts`

### Phase 4: GTD Clarification UI (Days 8-15) 🟡 High
**Objective**: Complete GTD workflow with clarification wizard frontend.
**Current Status**: 50% complete (API complete, UI missing).

| Priority | Task | Effort | Status | Dependencies |
| --- | --- | --- | --- | --- |
| ✅ | Clarification service | 4h | Done | — |
| ✅ | Clarification controller | 2h | Done | — |
| ✅ | Checklist CRUD | 4h | Done | — |
| P0 | ClarificationWizard component | 8h | TODO | React |
| P0 | Wizard step components | 6h | TODO | Wizard |
| P1 | useKeyboardShortcuts hook | 3h | TODO | Wizard |
| P1 | SomedayView page | 4h | TODO | API |
| P1 | WaitingView page | 4h | TODO | API |
| P1 | StaleView page | 3h | TODO | API |
| P2 | Task breakdown UI | 4h | TODO | Wizard |

**Deliverables**:
- `apps/web/src/components/ClarificationWizard.tsx`
- `apps/web/src/components/wizard/ActionableStep.tsx`
- `apps/web/src/components/wizard/TwoMinuteStep.tsx`
- `apps/web/src/components/wizard/NextActionStep.tsx`
- `apps/web/src/components/wizard/ContextStep.tsx`
- `apps/web/src/components/wizard/ProjectStep.tsx`
- `apps/web/src/components/wizard/WaitingStep.tsx`
- `apps/web/src/components/wizard/DueDateStep.tsx`
- `apps/web/src/hooks/useKeyboardShortcuts.ts`
- `apps/web/src/pages/SomedayView.tsx`
- `apps/web/src/pages/WaitingView.tsx`
- `apps/web/src/pages/StaleView.tsx`

### Phase 5: Automation Engine Worker (Days 16-28) 🟡 High
**Objective**: Implement worker-side rule processing with BullMQ.
**Current Status**: 25% complete (API CRUD done, no worker implementation).

| Priority | Task | Effort | Status | Dependencies |
| --- | --- | --- | --- | --- |
| ✅ | Rule service CRUD | 4h | Done | — |
| ✅ | Rule controller | 2h | Done | — |
| P0 | RuleRun schema model | 1h | TODO | Prisma |
| P0 | Install BullMQ | 1h | TODO | Redis |
| P0 | Trigger registry | 4h | TODO | BullMQ |
| P0 | Task triggers (created/moved/completed) | 4h | TODO | Registry |
| P0 | Schedule triggers | 3h | TODO | Registry |
| P0 | Stale trigger | 2h | TODO | Registry |
| P0 | Condition evaluator | 6h | TODO | Triggers |
| P0 | Action registry | 4h | TODO | Evaluator |
| P0 | Task actions | 4h | TODO | Registry |
| P1 | Notification actions | 3h | TODO | Registry |
| P0 | Rule processor (BullMQ) | 4h | TODO | All above |
| P1 | Idempotency service | 3h | TODO | Processor |
| P1 | RuleBuilder UI | 8h | TODO | React |
| P1 | Outbox service | 4h | TODO | API |

**Deliverables**:
- `prisma/schema.prisma` (add RuleRun, Outbox models)
- `apps/worker/src/modules/rules/rules.module.ts`
- `apps/worker/src/modules/rules/triggers/trigger.registry.ts`
- `apps/worker/src/modules/rules/triggers/task.triggers.ts`
- `apps/worker/src/modules/rules/triggers/schedule.triggers.ts`
- `apps/worker/src/modules/rules/triggers/stale.trigger.ts`
- `apps/worker/src/modules/rules/conditions/evaluator.ts`
- `apps/worker/src/modules/rules/conditions/field.conditions.ts`
- `apps/worker/src/modules/rules/conditions/relation.conditions.ts`
- `apps/worker/src/modules/rules/actions/action.registry.ts`
- `apps/worker/src/modules/rules/actions/task.actions.ts`
- `apps/worker/src/modules/rules/actions/notification.actions.ts`
- `apps/worker/src/modules/rules/rule.processor.ts`
- `apps/worker/src/modules/rules/idempotency.service.ts`
- `apps/api/src/modules/events/outbox.service.ts`
- `apps/web/src/components/RuleBuilder.tsx`

### Phase 6: Recurring Templates & Scheduler (Days 29-38) 🟢 Medium
**Objective**: Implement scheduled task creation from templates.
**Current Status**: 25% complete (API CRUD done, no scheduler worker).

| Priority | Task | Effort | Status | Dependencies |
| --- | --- | --- | --- | --- |
| ✅ | Template service | 4h | Done | — |
| ✅ | Template controller | 2h | Done | — |
| ✅ | Weekly review seed | 2h | Done | — |
| P0 | Install rrule package | 0.5h | TODO | None |
| P0 | RRULE parser service | 3h | TODO | rrule |
| P0 | Scheduler worker | 4h | TODO | RRULE parser |
| P0 | Template executor | 3h | TODO | Scheduler |
| P1 | Skip/dismiss API | 2h | TODO | API |
| P1 | Email service (Nodemailer) | 3h | TODO | SMTP |
| P1 | TemplateBuilder UI | 6h | TODO | React |
| P1 | RRulePicker component | 4h | TODO | UI |

**Deliverables**:
- `apps/worker/src/modules/scheduler/scheduler.module.ts`
- `apps/worker/src/modules/scheduler/rrule.parser.ts`
- `apps/worker/src/modules/scheduler/scheduler.worker.ts`
- `apps/worker/src/modules/scheduler/template.executor.ts`
- `apps/worker/src/modules/notifications/email.service.ts`
- `apps/web/src/components/TemplateBuilder.tsx`
- `apps/web/src/components/RRulePicker.tsx`

### Phase 7: Analytics Dashboard & Charts (Days 39-50) 🟢 Medium
**Objective**: Metrics visualization and weekly review dashboard.
**Current Status**: 30% complete (API endpoints done, no worker or UI).

| Priority | Task | Effort | Status | Dependencies |
| --- | --- | --- | --- | --- |
| ✅ | Analytics service | 4h | Done | — |
| ✅ | CFD endpoint | 3h | Done | — |
| ✅ | Throughput endpoint | 2h | Done | — |
| ✅ | Lead/cycle metrics endpoint | 2h | Done | — |
| ✅ | Stale tasks endpoint | 2h | Done | — |
| ✅ | WIP breaches endpoint | 2h | Done | — |
| P0 | ColumnSnapshot schema model | 1h | TODO | Prisma |
| P0 | TaskMetric schema model | 1h | TODO | Prisma |
| P0 | Snapshot worker | 4h | TODO | Schema |
| P0 | Metrics calculator | 4h | TODO | Schema |
| P1 | Install recharts | 0.5h | TODO | None |
| P1 | CFDChart component | 4h | TODO | recharts |
| P1 | ThroughputChart component | 3h | TODO | recharts |
| P1 | LeadCycleScatter component | 4h | TODO | recharts |
| P0 | ReviewDashboard page | 6h | TODO | Charts |
| P2 | AgingWipBadge component | 2h | TODO | UI |

**Deliverables**:
- `prisma/schema.prisma` (add ColumnSnapshot, TaskMetric models)
- `apps/worker/src/modules/analytics/analytics.module.ts`
- `apps/worker/src/modules/analytics/snapshot.worker.ts`
- `apps/worker/src/modules/analytics/metrics.calculator.ts`
- `apps/web/src/components/charts/CFDChart.tsx`
- `apps/web/src/components/charts/ThroughputChart.tsx`
- `apps/web/src/components/charts/LeadCycleScatter.tsx`
- `apps/web/src/pages/ReviewDashboard.tsx`
- `apps/web/src/components/AgingWipBadge.tsx`

### Phase 8: Testing & Quality (Days 51-60) 🟢 Medium
**Objective**: Production-ready quality with comprehensive tests.
**Current Status**: 5% complete (only 1 test file exists).

| Priority | Task | Effort | Status | Dependencies |
| --- | --- | --- | --- | --- |
| P0 | Test setup (Jest + Vitest) | 2h | TODO | None |
| P0 | TaskService unit tests | 4h | TODO | Jest |
| P0 | BoardService unit tests | 3h | TODO | Jest |
| P0 | ClarificationService tests | 3h | TODO | Jest |
| P0 | RuleService unit tests | 3h | TODO | Jest |
| P0 | AnalyticsService tests | 3h | TODO | Jest |
| P1 | Condition evaluator tests | 3h | TODO | Jest |
| P1 | Action executor tests | 3h | TODO | Jest |
| P1 | Testcontainers setup | 2h | TODO | Docker |
| P1 | Board workflow integration tests | 4h | TODO | Testcontainers |
| P1 | Rule execution integration tests | 4h | TODO | Testcontainers |
| P2 | Playwright setup | 2h | TODO | None |
| P2 | E2E capture-to-done flow | 4h | TODO | Playwright |
| P2 | E2E clarification wizard | 3h | TODO | Playwright |
| P2 | k6 load tests | 4h | TODO | k6 |

**Deliverables**:
- `apps/api/src/modules/tasks/__tests__/task.service.spec.ts`
- `apps/api/src/modules/boards/__tests__/board.service.spec.ts`
- `apps/api/src/modules/boards/__tests__/wip.service.spec.ts`
- `apps/api/src/modules/clarification/__tests__/clarification.service.spec.ts`
- `apps/api/src/modules/rules/__tests__/rule.service.spec.ts`
- `apps/api/src/modules/analytics/__tests__/analytics.service.spec.ts`
- `apps/worker/src/modules/rules/__tests__/evaluator.spec.ts`
- `tests/integration/testcontainers.setup.ts`
- `tests/integration/board-workflow.spec.ts`
- `tests/integration/rule-execution.spec.ts`
- `tests/e2e/playwright.config.ts`
- `tests/e2e/capture-to-done.spec.ts`
- `tests/e2e/clarification-wizard.spec.ts`
- `tests/load/board.k6.js`

### Phase 9: Observability & Hardening (Days 61-68) 🟢 Medium
**Objective**: Production observability and operational tooling.

| Priority | Task | Effort | Status | Dependencies |
| --- | --- | --- | --- | --- |
| P0 | Notification schema model | 1h | TODO | Prisma |
| P1 | OpenTelemetry setup | 4h | TODO | None |
| P1 | Prometheus metrics | 4h | TODO | prom-client |
| P1 | Structured logging (Pino) | 3h | TODO | None |
| P1 | Backup script | 3h | TODO | pg_dump |
| P1 | Restore script | 2h | TODO | pg_restore |
| P2 | PWA manifest | 1h | TODO | None |
| P2 | Enhanced service worker | 4h | TODO | SW |
| P2 | Security scan CI | 2h | TODO | GH Actions |
| P2 | Health check dashboard | 3h | TODO | API |

**Deliverables**:
- `prisma/schema.prisma` (add Notification model)
- `apps/api/src/telemetry/tracing.ts`
- `apps/api/src/metrics/prometheus.module.ts`
- `apps/api/src/metrics/custom.metrics.ts`
- `apps/api/src/logging/logger.service.ts`
- `scripts/backup.sh`
- `scripts/restore.sh`
- `apps/web/public/manifest.json`
- `apps/web/public/sw.js` (enhanced)
- `.github/workflows/security.yml`

---

### Effort Summary

| Phase | Total Effort | Status |
| --- | --- | --- |
| Phase 1-2 | ~40h | ✅ Complete |
| Phase 3: Security | ~25h | 🔴 40% done |
| Phase 4: Clarification UI | ~36h | 🟡 50% done |
| Phase 5: Automation Worker | ~55h | 🟡 25% done |
| Phase 6: Scheduler | ~25h | 🟢 25% done |
| Phase 7: Analytics UI | ~30h | 🟢 30% done |
| Phase 8: Testing | ~45h | 🟢 5% done |
| Phase 9: Observability | ~25h | 🟢 0% done |
| **Total Remaining** | **~200h** | |

### Recommended Execution Order

1. **Phase 3: Security** - Critical for any deployment
2. **Phase 5: Automation Worker** - Core differentiating feature
3. **Phase 6: Scheduler** - Enables recurring templates
4. **Phase 4: Clarification UI** - Completes GTD workflow
5. **Phase 7: Analytics UI** - Enables weekly review
6. **Phase 8: Testing** - Production readiness
7. **Phase 9: Observability** - Production hardening

---

## 13. Appendix A: Environment Variables Reference

```bash
# .env.example - Complete configuration reference

# ===== Database =====
DATABASE_URL=postgresql://postgres:password@localhost:5432/kanban
DATABASE_POOL_SIZE=10

# ===== Redis =====
REDIS_URL=redis://localhost:6379
REDIS_QUEUE_PREFIX=pk

# ===== API Server =====
API_PORT=3000
API_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# ===== Security =====
CAPTURE_ACCESS_TOKEN=your-secure-token-here
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ===== Rate Limiting =====
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
CAPTURE_RATE_LIMIT_MAX=60

# ===== IMAP (Optional) =====
IMAP_HOST=
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USERNAME=
IMAP_PASSWORD=
IMAP_MAILBOX=INBOX
IMAP_POLL_INTERVAL_MS=60000
IMAP_DEFAULT_BOARD_ID=
IMAP_DEFAULT_OWNER_ID=
IMAP_DEFAULT_COLUMN_ID=

# ===== SMTP (Optional) =====
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=noreply@example.com

# ===== Object Storage (Optional) =====
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=kanban-attachments
S3_ACCESS_KEY=
S3_SECRET_KEY=

# ===== Observability =====
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## 14. Appendix B: API Endpoint Reference

### Core Endpoints (Implemented)
| Method | Path | Description |
| --- | --- | --- |
| GET | /health | Health check |
| GET | /users | List users |
| POST | /users/register | Register user + seed board |
| GET | /users/:id | Get user by ID |
| GET | /boards | List boards for owner |
| GET | /boards/:id | Get board with columns |
| POST | /boards | Create board |
| PATCH | /boards/:id | Update board |
| GET | /boards/:boardId/tasks | List tasks for board |
| GET | /tasks/:id | Get task by ID |
| POST | /tasks | Create task |
| PATCH | /tasks/:id | Update task |
| POST | /api/v1/capture | Quick capture |

### Planned Endpoints (Gap Fill)
| Method | Path | Description | WS |
| --- | --- | --- | --- |
| POST | /tasks/:id/move | Move task to column | WS2 |
| GET | /columns/:id | Get column | WS2 |
| POST | /boards/:id/columns | Create column | WS2 |
| PATCH | /columns/:id | Update column | WS2 |
| DELETE | /columns/:id | Delete column | WS2 |
| POST | /columns/reorder | Reorder columns | WS2 |
| GET | /boards/:id/tags | List tags | WS2 |
| POST | /boards/:id/tags | Create tag | WS2 |
| PATCH | /tags/:id | Update tag | WS2 |
| DELETE | /tags/:id | Delete tag | WS2 |
| GET | /boards/:id/clarify/next | Get next unclarified | WS4 |
| POST | /tasks/:id/clarify | Submit clarification | WS4 |
| POST | /tasks/:id/checklist | Add checklist item | WS4 |
| PATCH | /checklist/:id | Update checklist item | WS4 |
| DELETE | /checklist/:id | Delete checklist item | WS4 |
| GET | /boards/:id/rules | List rules | WS5 |
| POST | /boards/:id/rules | Create rule | WS5 |
| PATCH | /rules/:id | Update rule | WS5 |
| DELETE | /rules/:id | Delete rule | WS5 |
| POST | /rules/:id/toggle | Enable/disable rule | WS5 |
| GET | /boards/:id/templates | List templates | WS6 |
| POST | /boards/:id/templates | Create template | WS6 |
| PATCH | /templates/:id | Update template | WS6 |
| DELETE | /templates/:id | Delete template | WS6 |
| POST | /templates/:id/skip | Skip next occurrence | WS6 |
| GET | /analytics/cfd | CFD data | WS7 |
| GET | /analytics/throughput | Throughput metrics | WS7 |
| GET | /analytics/lead-time | Lead/cycle times | WS7 |
| GET | /analytics/stale | Stale tasks list | WS7 |
| GET | /analytics/wip-breaches | WIP breach history | WS7 |

---

## 15. Appendix C: WebSocket Events Reference

### Current Events
| Event | Direction | Payload | Description |
| --- | --- | --- | --- |
| join | Client → Server | `{ boardId }` | Join board room |
| board:update | Server → Client | `{ type, taskId, timestamp }` | Task changed |

### Planned Events (Gap Fill)
| Event | Direction | Payload | Description |
| --- | --- | --- | --- |
| task:created | Server → Client | `{ task, boardId }` | New task created |
| task:moved | Server → Client | `{ taskId, fromColumn, toColumn }` | Task moved |
| task:updated | Server → Client | `{ taskId, changes }` | Task fields updated |
| task:deleted | Server → Client | `{ taskId }` | Task deleted |
| wip:breach | Server → Client | `{ columnId, current, limit }` | WIP limit exceeded |
| rule:triggered | Server → Client | `{ ruleId, taskId, actions }` | Rule executed |
| template:created | Server → Client | `{ taskId, templateId }` | Recurring task created |
| notification | Server → Client | `{ type, message, link }` | User notification |

---

## 16. Appendix D: Database Schema Additions (Gap Fill)

```prisma
// Additional models to add to schema.prisma

model Outbox {
  id            String    @id @default(uuid()) @db.Uuid
  aggregateType String
  aggregateId   String    @db.Uuid
  eventType     String
  payload       Json
  createdAt     DateTime  @default(now())
  processedAt   DateTime?

  @@index([processedAt])
  @@index([createdAt])
}

model RuleRun {
  id         String   @id @default(uuid()) @db.Uuid
  ruleId     String   @db.Uuid
  eventId    String?  @db.Uuid
  status     String   // 'pending', 'running', 'success', 'failed'
  startedAt  DateTime @default(now())
  finishedAt DateTime?
  error      String?
  logs       Json?
  rule       Rule     @relation(fields: [ruleId], references: [id])

  @@index([ruleId])
  @@index([status])
}

model ColumnSnapshot {
  id          String   @id @default(uuid()) @db.Uuid
  boardId     String   @db.Uuid
  columnId    String   @db.Uuid
  timestamp   DateTime @default(now())
  taskCount   Int
  wipBreached Boolean  @default(false)
  board       Board    @relation(fields: [boardId], references: [id])
  column      Column   @relation(fields: [columnId], references: [id])

  @@index([boardId, timestamp])
  @@index([columnId])
}

model TaskMetric {
  id           String   @id @default(uuid()) @db.Uuid
  taskId       String   @unique @db.Uuid
  leadTimeSec  Int      // seconds from created to completed
  cycleTimeSec Int      // seconds from first work column to completed
  completedAt  DateTime
  task         Task     @relation(fields: [taskId], references: [id])

  @@index([completedAt])
}

model Notification {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @db.Uuid
  channel     String    // 'in_app', 'email'
  type        String    // 'rule_triggered', 'reminder', 'stale_alert'
  payload     Json
  createdAt   DateTime  @default(now())
  deliveredAt DateTime?
  readAt      DateTime?
  user        User      @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([deliveredAt])
}
```

---

## 17. Conclusion (Updated Gap Analysis)

This implementation plan provides a comprehensive roadmap from the current state to full GTD + Kanban platform functionality.

### Current Achievement Summary

| Area | Progress | Key Accomplishments |
| --- | --- | --- |
| **Infrastructure** | 100% | Docker Compose, config, health checks, seed data |
| **Core API** | 90% | All domain services, CRUD endpoints, WebSocket gateway |
| **Board UI** | 100% | Kanban board with dnd-kit, filters, WIP indicators |
| **Capture Pipeline** | 85% | Web capture, voice, offline queue, IMAP, extension |
| **Security** | 40% | Rate limiting, capture token guard |
| **GTD Flow** | 50% | Clarification API, checklist (no wizard UI) |
| **Automation** | 25% | Rule API only (no worker) |
| **Templates** | 25% | Template API only (no scheduler) |
| **Analytics** | 30% | Analytics API only (no worker/charts) |
| **Testing** | 5% | Minimal coverage |

### Key Takeaways

1. **Strong Foundation**: Phases 1-2 are complete with full infrastructure and a working Kanban UI
2. **API-First Approach**: Most backend services are implemented, enabling parallel frontend work
3. **Critical Gap**: Worker-side automation and scheduling are the largest missing pieces
4. **Security Priority**: Authentication should be addressed before production deployment
5. **~200 hours remaining**: Concentrated in worker services, frontend UIs, and testing

### Recommended Next Steps

| Priority | Phase | Rationale |
| --- | --- | --- |
| 🔴 Critical | Phase 3: Security | Required for production deployment |
| 🔴 Critical | Phase 5: Automation Worker | Core differentiating feature, enables rule-based automation |
| 🟡 High | Phase 6: Scheduler | Enables recurring templates and weekly review |
| 🟡 High | Phase 4: Clarification UI | Completes the GTD workflow for end users |
| 🟢 Medium | Phase 7: Analytics UI | Enables data-driven weekly reviews |
| 🟢 Medium | Phase 8: Testing | Ensures production quality |
| 🟢 Medium | Phase 9: Observability | Production monitoring and operations |

### Files to Create/Modify Next

**Highest Priority Files** (Phase 3 + 5):
```
# Security
apps/api/src/modules/auth/password.service.ts
apps/api/src/modules/auth/jwt.service.ts
apps/api/src/modules/auth/strategies/local.strategy.ts
apps/api/src/modules/auth/strategies/jwt.strategy.ts
apps/api/src/guards/session.guard.ts
apps/api/src/guards/jwt.guard.ts

# Worker Automation
prisma/schema.prisma (add RuleRun, Outbox, ColumnSnapshot, TaskMetric, Notification)
apps/worker/src/modules/rules/rules.module.ts
apps/worker/src/modules/rules/triggers/trigger.registry.ts
apps/worker/src/modules/rules/conditions/evaluator.ts
apps/worker/src/modules/rules/actions/action.registry.ts
apps/worker/src/modules/rules/rule.processor.ts
```

The priority execution roadmap (Section 12) should be used to guide sprint planning, with **Phase 3 (Security) and Phase 5 (Automation Worker)** being the highest priorities for the next development cycle.
