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

## 3. Workstreams & Deliverables

### WS0 – Environment & Foundations (Week 1)
- Scaffold monorepo (pnpm/workspaces) with `apps/api`, `apps/worker`, `apps/web`, `packages/shared`.
- Configure TypeScript project references, linting, prettier, basic CI (lint + test).
- Stand up Docker Compose: Postgres, Redis, Mailhog, MinIO (optional), API, worker, web.
- Implement health checks, config management, and secret handling (dotenv + validation).

### WS1 – Core Domain & Persistence (Weeks 1–2)
- Define schema for users, boards, columns, tasks, projects, tags, task events, rules, recurring templates.
- Implement Prisma/TypeORM migrations, repositories, and domain services (TaskService, BoardService, ProjectService).
- Add transactional outbox pattern for TaskEvents (table + publisher service) and seed initial columns/wip limits.

### WS2 – Board API & UI (Weeks 2–4)
- REST/GraphQL endpoints for boards, columns, tasks, drag/drop move operations with validation + WIP limit rules.
- WebSocket gateway broadcasting TaskEvents per board via Redis pub/sub.
- React board view with drag/drop (dnd-kit), column configuration, WIP indicators, context filters, project filters, Inbox-only view.

### WS3 – Capture Pipeline (Weeks 4–6)
- Quick-add endpoint + UI (text + optional voice capture using Web Speech API; fallback when unavailable).
- PWA enhancements (service worker, offline queue for captures).
- WebExtension MVP hitting signed webhook endpoint (token scoped per device, rate limited).
- IMAP poller worker using `imapflow`: fetch unseen mail, persist raw message (S3/MinIO), create Input queue tasks with email metadata.

### WS4 – Clarification & GTD Wizard (Weeks 5–7)
- Clarification mode API: fetch single unclarified task, step-by-step decisions (actionable, two-minute, next action entry, context, project, waiting-for, due date, breakdown flag).
- UI wizard with keyboard shortcuts + metrics on throughput.
- Someday/Waiting dedicated views and checklist support in tasks.

### WS5 – Automation Engine (Weeks 7–9)
- Rule entity CRUD, JSON schema validation, versioning, and audit logs.
- Trigger adapters for task.created/moved/completed, stale-detected, email.received, schedule tick.
- Condition evaluator (field filters, tag/project checks, age/due windows) with deterministic ordering.
- Action executors (create/update/move task, checklist management, notifications, email archive hook) with idempotency + retries.
- Worker processors for event-driven rules (`rules:triggered`) and scheduled jobs (`rules:scheduled`).

### WS6 – Recurring Templates & Scheduler (Weeks 9–10)
- Template builder UI (payload editor, RRULE/cron config, timezone).
- Scheduler worker computing `next_run_at`, enqueuing template execution, handling skips/dismissals.
- Weekly review template seeded with checklist + analytics links; optional email reminder via SMTP.

### WS7 – Analytics & Review Surfaces (Weeks 10–12)
- TaskEvent ingestion into snapshots (hourly/daily column counts) + lead/cycle calculations.
- API endpoints feeding CFD, lead/cycle scatter, aging WIP, stale-task list.
- Weekly review dashboard referencing analytics, stale tasks, WIP breaches, Someday/Waiting review flows.

### WS8 – DevOps, Security, Hardening (Weeks 12–13)
- Authentication (session + JWT for extensions), CSRF protection, rate limiting, RBAC hooks.
- Observability: OpenTelemetry tracing, Prometheus metrics (queue lag, rule failures), structured logging.
- Backup strategy (Postgres dumps, Redis snapshot policy), disaster recovery scripts.
- Load/perf tests on board interactions and automation throughput; docs for deployment, environment variables, upgrade path.

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
