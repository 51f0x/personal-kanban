# Software Requirements Specification (SRS)

## 1. Introduction
### 1.1 Purpose
Describe the requirements for a fully self-hosted Personal Kanban + GTD web application that unifies capture, clarification, automation, recurring tasks, and analytics without relying on third-party automation platforms.

### 1.2 Scope
The system provides a configurable Kanban board aligned with GTD principles, rich capture mechanisms (web, PWA, IMAP, browser extension), an automation/rules engine, recurring task scheduler, LeanKit-style analytics, and deployment tooling for user-owned infrastructure. The scope includes backend services (Node/Nest/BullMQ), frontend SPA/PWA, browser extension, workers, and DevOps artifacts.

### 1.3 Definitions & Acronyms
- **GTD**: Getting Things Done productivity framework.
- **WIP**: Work In Progress.
- **CFD**: Cumulative Flow Diagram.
- **RRULE**: Recurrence rule format from iCalendar.
- **PWA**: Progressive Web App.
- **TaskEvent**: Immutable record of task lifecycle changes.

### 1.4 References
- User-provided workflow description and LeanKit/GTD article summary.
- implementation-plan.md (project execution strategy).
- architect.mdc (architecture guidance).

## 2. System Overview
### 2.1 Product Perspective
The product is a standalone platform deployed on infrastructure owned by the user. It exposes web/PWA frontends, REST/GraphQL APIs, WebSocket channels, and optional browser/mobile capture integrations. No reliance on SaaS automation services is permitted; only standard protocols (HTTPS, IMAP, SMTP) are allowed.

### 2.2 User Classes & Characteristics
- **Primary user**: knowledge worker needing GTD-style organization and contextual execution.
- **Optional collaborators**: family/assistant participants (future multi-user support considered).
- **System operator**: person deploying/maintaining the stack (may be same as primary user).

### 2.3 Operating Environment
- Backend: Node 20+, NestJS 10+, BullMQ 4+, Postgres 14+, Redis 6+.
- Client: modern browsers supporting ES2022, Web Speech API (optional), service workers.
- Infrastructure: Docker/Kubernetes, HTTPS reverse proxy, IMAP/SMTP endpoints managed by user.

### 2.4 Assumptions & Dependencies
- Users can provision and secure their own servers, mailboxes, TLS certificates.
- Reliable connectivity between services (API, Redis, Postgres, IMAP, SMTP).
- Browser extension distribution handled by user (self-signed or store submission).
- Voice capture uses local browser APIs; no cloud speech services.

## 3. Functional Requirements
### 3.1 Board & Task Management
- Configurable columns/lanes with defaults (Input, Define Next Actions, Someday/Maybe, Waiting For, Won't Do, Done Immediately, context columns such as Email/Meetings/Phone/Read/Desk).
- Drag-and-drop task movement with WIP limit enforcement (warn/block modes).
- Task fields: title, description, context enum, tags (many-to-many), project, column, due date, checklist items, waiting-for text/contact, needs-breakdown flag, metadata JSON (URLs, email IDs), timestamps (`created_at`, `updated_at`, `completed_at`, `last_moved_at`).
- Project entity with description, desired outcome, status, and linked tasks; project filters in board view.
- Context filters, Waiting-on view, Someday/Maybe list, Inbox-only triage view.

### 3.2 Capture Mechanisms
- **Web/PWA quick add**: single input supporting free text + auto URL detection; optional Web Speech API capture with fallback.
- **Offline capture queue**: PWA stores unsent entries and syncs when online.
- **Browser extension**: WebExtension capturing tab title/URL, optional notes, sending signed request to capture endpoint.
- **Mobile widget/PWA shortcut**: minimal form hitting same API.
- **Email import**: IMAP poller fetches unseen messages, stores metadata/attachments (local/S3) and creates Input queue cards; handles dedupe via UID and marks processed mail via configurable action (flag, archive, delete).

### 3.3 Clarification Flow (GTD Wizard)
- Wizard retrieves next unprocessed Input card and guides through steps: actionable?, two-minute rule, define next action, choose context, assign project, specify waiting-for entity, toggle needs-breakdown, set due date.
- Quick actions: move to Done Immediately, Won't Do, Someday/Maybe, Waiting For, or relevant context lane.
- Keyboard shortcuts and timer metrics for throughput tracking.

### 3.4 Automation & Rules Engine
- Rule model: trigger + condition set + ordered actions stored as JSON with versioning and audit logs.
- Supported triggers: task created/moved/completed, column change, stale detection, scheduled time (cron/RRULE), email received, manual button, webhook capture event.
- Conditions: column, context, tags, project, due date windows, age (created or last moved), metadata values, stale flag.
- Actions: create task (optionally from template), update fields, move columns, apply tags, add checklist items, send notifications/email, mark related email as processed, enqueue custom webhooks, stop further rules.
- Execution via BullMQ processors with retries, dedupe keys, and dead-letter queues; rule run logs stored for audit.

### 3.5 Recurring Templates & Scheduler
- Template entity storing task payload, checklist, target column/context, WIP override, `rrule`/cron expression, timezone, skip/next-run metadata.
- Scheduler worker evaluates due templates, enqueues task creation jobs, records outcomes, handles skipped/missed occurrences, and adjusts for DST.
- Weekly Review template includes checklist, links to analytics/stale view, and optional email reminder.

### 3.6 Analytics & Review
- TaskEvent logging for every lifecycle change (create/move/update/complete/stale).
- Snapshot service aggregating column counts hourly/daily for CFD.
- Metrics: Cumulative Flow Diagram, lead time (creation→completion), cycle time (entering work column→done), throughput, WIP breach history, stale tasks list (>=7 days since last move), aging WIP chart.
- Weekly review dashboard summarizing stale work, Someday review list, Waiting-for items, WIP status, throughput trends, and checklist completion.

### 3.7 Notifications & Reminders
- Channels: in-app (WebSocket + push), email via user-controlled SMTP.
- Events: rule outputs, recurring task creation, weekly review reminder, stale task alert, IMAP failures, automation errors.
- Notification preferences per user (quiet hours, channel opt-in).

### 3.8 Security & Settings
- Authentication via session (web) and JWT (extensions/mobile) with refresh tokens; optional WebAuthn.
- CSRF protection for browser forms, rate limiting for capture endpoints, per-device API tokens.
- Settings for WIP limits, contexts, columns, stale thresholds, IMAP/SMTP credentials, automation toggles.

## 4. External Interface Requirements
### 4.1 User Interfaces
- Responsive SPA/PWA supporting dark/light themes, drag/drop board, wizard modal, analytics dashboards, capture bar on every page.
- Browser extension popup (minimal UI) and context-menu entry for quick capture.
- Weekly Review view combining metrics with actionable lists.

### 4.2 APIs
- REST/GraphQL endpoints for boards, columns, tasks, projects, tags, rules, templates, notifications, analytics.
- WebSocket namespace for live board updates and notification stream.
- Auth endpoints (login, refresh, token revoke).
- Capture webhooks with signed HMAC tokens.

### 4.3 Hardware & Software Interfaces
- IMAP client (e.g., Dovecot) via TLS, SMTP server via TLS with authentication.
- Optional object storage (S3-compatible) for email attachments.
- No third-party automation integrations allowed.

### 4.4 Communications Protocols
- HTTPS for all web APIs, WSS for real-time channels.
- IMAPS (993) and SMTPS (465/587) for email services.
- Redis protocol for BullMQ queues and pub/sub.

## 5. System Architecture
- **Frontend**: React + Vite (TypeScript) PWA, service worker for offline capture, state managed via Zustand/Redux, component library with accessibility support.
- **Backend API**: NestJS modular monolith exposing REST/GraphQL/WebSocket. Modules: Auth, Board, Task, Project, Tag, Rule, Template, Analytics, Notification, Integration.
- **Worker Service**: Nest microservice executing BullMQ queues (rules, scheduler, IMAP poller, analytics snapshotter, notification dispatcher).
- **Data Layer**: Prisma/TypeORM connecting to Postgres (JSONB for metadata), migrations tracked via schema versioning.
- **Eventing**: Transactional outbox table ensures TaskEvents published to Redis/BullMQ; WebSocket gateway subscribes to Redis channels per board.
- **Deployment**: Docker images for API, worker, web; Compose or Helm charts; Nginx/Caddy reverse proxy; OpenTelemetry collectors; Prometheus/Grafana stack.

## 6. Data Design
| Entity | Description | Key Fields |
| --- | --- | --- |
| `users` | Account + settings | id, email, name, timezone, notification prefs |
| `boards` | Kanban boards | id, owner_id, name, config JSON |
| `columns` | Lanes with WIP | id, board_id, name, type enum, wip_limit, order |
| `tasks` | Work items | id, board_id, column_id, title, description, context, project_id, waiting_for, due_at, needs_breakdown, metadata JSON, timestamps |
| `task_checklist_items` | Subtasks | id, task_id, text, done, order |
| `projects` | GTD projects | id, owner_id, name, outcome, status |
| `tags` / `task_tags` | Tag taxonomy | id, name, color |
| `task_events` | Lifecycle records | id, task_id, type, from_column, to_column, payload JSON, timestamp |
| `rules` | Automation definitions | id, board_id, name, enabled, trigger JSON, conditions JSON, actions JSON, priority |
| `rule_runs` | Audit logs | id, rule_id, event_id, status, started_at, finished_at, error |
| `recurring_templates` | Task templates | id, board_id, payload JSON, rrule, timezone, next_run_at, skip flags |
| `column_snapshots` | Analytics | id, board_id, column_id, timestamp, count |
| `notifications` | Messages | id, user_id, channel, payload, delivered_at |
| `integration_endpoints` | IMAP/SMTP/Webhook configs | id, type, credentials ref, settings |

Indexes: board/column combos, last_moved_at, stale flag, rule trigger fields, template schedules. Foreign keys with cascading deletes where appropriate.

## 7. Non-Functional Requirements
- **Performance**: API p95 < 300 ms for board operations; WebSocket update fan-out within 200 ms; BullMQ queue latency < 2 s under nominal load; IMAP polling cycle completes within configured interval.
- **Availability**: 99.5% uptime target for single-node deployment; graceful degradation (capture still available if analytics offline).
- **Reliability**: Transactional outbox ensures no lost events; retry/backoff for IMAP and SMTP interactions; automated backups nightly.
- **Security**: HTTPS, CSRF protection, input validation, RBAC-ready auth, encrypted secrets (libsodium), audit log retention (90+ days), OWASP best practices.
- **Scalability**: Horizontal scaling for API and worker containers; Redis + Postgres tuned with connection pooling; stateless API nodes with shared session store (Redis).
- **Maintainability**: Modular Nest architecture, shared DTO packages, lint/test CI, ADR tracking, feature flag support.
- **Usability**: WCAG 2.1 AA compliance target; keyboard-first wizard; drag/drop accessible via alternative controls; responsive layout for desktop/tablet/mobile.
- **Compliance/Privacy**: Data stored only on user infrastructure; configurable retention policies for email artifacts.

## 8. Operational Requirements
- **Deployment pipeline**: GitHub Actions (lint, unit, integration, e2e, docker build, deploy). Promotion requires manual approval + test evidence.
- **Monitoring**: Prometheus metrics (API latency, queue depth, IMAP errors), Grafana dashboards, alert rules (Slack/email) for critical events.
- **Backups**: Automated Postgres dumps + WAL, Redis snapshots, object storage replication for email bodies, documented restore drills.
- **Logging**: Structured JSON logs with correlation IDs; centralized log aggregation (Loki/ELK) for search.
- **Localization**: English default; architecture supports i18n for copy and date formats.

## 9. Appendices
### 9.1 Glossary
- **Clarification**: GTD step for deciding next action.
- **Stale task**: Task with `last_moved_at` older than configured threshold.
- **Rule run**: Execution instance of automation rule triggered by event/schedule.

### 9.2 Open Issues
- Confirm initial requirement for multi-user sharing vs single-user mode.
- Decide on storage target for raw email bodies (local disk or S3-compatible service).
- Determine analytics data retention duration.
- Validate timezone handling rules for recurring templates across DST changes.
