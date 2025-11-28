# Software Architecture Document (SAD)

## 1. Introduction
This document describes the architecture for a self-hosted Personal Kanban + GTD platform built on a Node/Nest/BullMQ stack. It complements the SRS and implementation plan by explaining architectural goals, component responsibilities, interactions, deployment topology, and quality tactics.

## 2. Architectural Goals & Constraints
- **Self-hosted ownership**: Run entirely on infrastructure controlled by the user; no SaaS automation dependencies.
- **GTD alignment**: Support capture, clarification, context-based execution, weekly review, and analytics grounded in GTD.
- **Scalable modular monolith**: Start as a NestJS modular monolith with clear module boundaries that can evolve into services later.
- **Deterministic automation**: Built-in rules engine replaces IFTTT/Zapier with auditable, idempotent workflows.
- **Observability & resilience**: Queue-based processing with metrics, tracing, and backpressure handling.
- **Security-first**: HTTPS, RBAC-ready auth, encrypted secrets, audit trails.

## 3. Stakeholders
- **End users**: Knowledge workers relying on GTD/Kanban.
- **Operations**: Individuals deploying and maintaining the system (may be same as end users).
- **Developers**: Build and extend the stack following this architecture.

## 4. Functional Overview
1. Capture tasks through web UI, PWA, browser extension, mobile widget, or IMAP import.
2. Clarify tasks using GTD wizard; route into contexts/lanes with WIP enforcement.
3. Automate flows via rule engine (triggers → conditions → actions) and recurring templates.
4. Provide analytics (CFD, lead/cycle time, stale tasks, WIP breaches) feeding weekly review workflows.
5. Notify users via in-app or email channels, powered by self-hosted SMTP.

## 5. System Context
```
[Browser/PWA] --HTTPS/WebSocket--> [API Gateway (NestJS)]
[Browser Extension] --HTTPS--> [Capture Endpoint]
[Mobile Widget] --HTTPS--> [API]
[IMAP Server] --IMAPS--> [IMAP Poller Worker]
[SMTP Server] <--SMTPS-- [Notification Worker]
[Postgres] <--> [API & Workers]
[Redis] <--> [API & Workers] (queues, cache, pub/sub)
```
External dependencies are limited to standard protocols (IMAP, SMTP). All other components reside within the deployer's network.

## 6. Architectural Viewpoints
### 6.1 Logical View (Modules)
- **Auth Module**: Sessions, JWTs, device tokens, CSRF protection, optional WebAuthn.
- **Board Module**: Boards, columns, WIP rules, drag/drop APIs, WebSocket broadcasting.
- **Task Module**: CRUD, checklists, context filters, project linkage, stale detection.
- **Project Module**: Project hierarchy, filtering, outcomes.
- **Capture Module**: Quick-add endpoints, offline sync APIs, extension/webhook handlers.
- **Integration Module**: IMAP/SMTP credentials, polling schedules, email metadata storage.
- **Automation Module**: Rules CRUD, trigger listeners, condition evaluation, action execution, audits.
- **Template Module**: Recurring templates, RRULE parsing, scheduler orchestration.
- **Analytics Module**: TaskEvent aggregation, CFD snapshots, lead/cycle metrics, review dashboards.
- **Notification Module**: In-app + email notifications, preference management.
- **Shared Library**: DTOs, validation schemas, domain events, logging utilities.

### 6.2 Process View (Runtime)
1. **Task capture**: Client sends POST /capture; API validates, writes task + TaskEvent + outbox entry; WebSocket notifies subscribers.
2. **IMAP ingestion**: Worker polls via `imapflow`, fetches unseen messages, dedupes by UID, stores payload, enqueues create-task job.
3. **Clarification**: UI fetches next Input task; user completes wizard; API updates task, moves columns, logs TaskEvent, publishes event.
4. **Automation**: TaskEvent inserted → outbox entry persisted → worker drains outbox to BullMQ `rules:triggered` queue → rule processor loads matching rules, evaluates conditions, executes actions (with nested TaskEvents) and logs run.
5. **Recurring tasks**: Scheduler worker scans templates (RRULE), enqueues creation jobs, updates `next_run_at`.
6. **Analytics**: Snapshot worker aggregates column counts hourly, stores in `column_snapshots`; analytics API queries precomputed aggregates.
7. **Notifications**: Rule action or system event enqueues message; notification worker renders template, sends via SMTP or WebSocket.

### 6.3 Physical/Deployment View
- **API Service**: NestJS HTTP+GraphQL+WebSocket server (stateless), scaled horizontally behind Nginx/Caddy.
- **Worker Service**: Nest microservice subscribed to BullMQ queues; multiple replicas for throughput.
- **Scheduler Service**: Cron-like Nest process enqueuing template/maintenance jobs (can run inside worker deployment with dedicated queue).
- **Frontend**: React SPA served as static assets via CDN/reverse proxy; PWA features via service worker.
- **Browser Extension**: Packaged WebExtension communicating with API using device tokens.
- **Backing services**: Postgres (primary + optional replicas), Redis (persistent for BullMQ + caching), optional MinIO/S3 for email attachments, Mailhog (dev).
- **Observability stack**: OpenTelemetry collector, Prometheus, Grafana, log aggregation (Loki/ELK).

## 7. Data Management
- **Primary store**: Postgres with normalized schema + JSONB fields for metadata, rules, templates.
- **Event storage**: `task_events` table and transactional outbox to ensure reliable delivery to rules/analytics.
- **Caching**: Redis for WIP counts, session store, queue data, WebSocket pub/sub.
- **Attachments**: Optional object storage for raw email bodies to avoid bloating Postgres.
- **Backups**: Nightly Postgres dumps + WAL archiving; Redis snapshots; object storage replication.

## 8. Integration Strategy
- IMAP integration uses long-lived connection with UID tracking; credentials encrypted (libsodium) and stored in Postgres.
- SMTP integration uses either self-hosted server or user-provided relay; notifications encapsulated in worker actions.
- Browser extension uses signed tokens scoped per device with limited permissions; rate limited at API gateway.

## 9. Security Architecture
- HTTPS termination at reverse proxy with automatic certificate renewal (e.g., Caddy/Certbot).
- Nest CSRF protection + Origin checks for browser endpoints; JWT for APIs used by extension/mobile.
- Password hashing (Argon2), MFA support roadmap; sessions stored in Redis with rotation.
- Secrets managed via environment variables / secret stores; IMAP/SMTP credentials encrypted at rest.
- Authorization policies enforced per board (single-owner initially, RBAC-ready for future multi-user).
- Audit trails via TaskEvents, RuleRuns, login logs.

## 10. Quality Attribute Tactics
| Attribute | Tactics |
| --- | --- |
| Performance | Async BullMQ workers, Redis caching, indexed queries, WebSocket delta updates |
| Scalability | Stateless API replicas, sharded queues, horizontal worker scaling, database connection pooling |
| Availability | Health checks, retry/backoff, dead-letter queues, backup IMAP polling schedule |
| Modifiability | Modular Nest architecture, shared DTOs, feature flags, ADR process |
| Observability | OpenTelemetry tracing, structured logging, Prometheus metrics, alerting |
| Security | HTTPS, CSRF/JWT, rate limiting, encrypted secrets, audit logs |

## 11. DevOps & CI/CD
- GitHub Actions pipeline (lint → unit → integration → e2e → docker build → deploy).
- Docker images for API, worker, frontend, supporting multi-stage builds.
- Environments: Local (Docker Compose), Staging (single VM), Production (HA). Migrations executed via CI step.
- Monitoring dashboards for API latency, queue depth, IMAP failures, rule success rate.
- Runbooks documenting incident handling (queue backlog, IMAP auth failure, SMTP outage, DB restore).

## 12. Risks & Mitigations
- **Automation loops**: Provide rule priorities, stop-propagation flag, and loop detection based on recent rule/task pairs.
- **IMAP variability**: Implement exponential backoff, connection health checks, and user-configurable polling windows.
- **Queue overload**: Autoscale workers, set queue depth alerts, support backpressure (temporarily disable non-critical rules).
- **Data growth**: Archive old TaskEvents, configurable retention for analytics snapshots, partition large tables.
- **Security misconfiguration**: Ship hardening guide, default TLS, secret rotation tooling, and automated dependency audits.

## 13. Roadmap Alignment
The architecture enables the phased milestones in `implementation-plan.md`: start with board/capture foundations, then layer GTD wizard, automation, recurrence, analytics, and finally security/ops hardening without rework.

## 14. Conclusion
This architecture balances self-hosted control with modern UX and automation capabilities. The modular NestJS design plus BullMQ workers deliver deterministic automation, while Postgres/Redis provide reliable state management. With observability, security, and deployment practices baked in, the system can evolve from single-user to collaborative scenarios as requirements grow.
