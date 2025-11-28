# Personal Kanban + GTD Platform PRD

## 1. Overview
A self-hosted productivity cockpit that merges Getting Things Done (GTD) principles with Kanban execution, realtime collaboration, and built-in automation. Targets individuals or small teams who want LeanKit-style visibility and automation without SaaS dependencies. Core promise: capture everything, clarify once, work by context, and trust the system because you own every component.

## 2. Goals & Non-Goals
### Goals
1. Single funnel capture: any input (web, extension, voice, IMAP, API) results in a card inside the Input queue.
2. Guided GTD clarification: fast triage flow (actionable?, next action, context, waiting-on, someday) directly on the board.
3. Context-first execution: boards configurable with context lanes + WIP limits; realtime updates keep UI synced.
4. Automation-ready foundation: record TaskEvents, enable rule triggers later, schedule recurring templates, detect stale work.
5. Self-hosted ownership: deploy via Docker; use Postgres/Redis/Node; no third-party automation connectors.

### Non-Goals (v1)
- Multi-tenancy beyond a single self-hosted deployment.
- Native mobile apps (PWA covers mobile capture needs initially).
- Full-blown analytics dashboards (basic CFD/stale views planned in later milestone).
- External automation connectors (IFTTT/Zapier) since goal is internal engine.

## 3. Personas
1. **Solo Knowledge Worker (“Alex”)**: juggling consulting/client work, wants trusted system for tasks/ideas, comfortable self-hosting.
2. **Household/Small Team Planner (“Sam”)**: organizes family/side business tasks with occasional shared boards.
3. **Tech-savvy Productivity Enthusiast (“Jordan”)**: replacing patchwork of Siri/IFTTT/LeanKit with a cohesive, hackable platform.

## 4. User Stories
1. As Alex, I can capture any note/URL/voice memo from web/mobile/extension/IMAP so everything lands in my Input queue without manual effort.
2. As Alex, I can register myself in the system without looking up UUIDs, and see my seeded board instantly.
3. As Sam, I can drag cards between context lanes while WIP limits highlight overload.
4. As Jordan, I see captured cards appear in real time on my board without refreshing.
5. As Alex, I can review stalled Someday/Waiting cards each week and flag stale work (>7 days).
6. As Jordan, I can trust that offline capture queues sync once I’m online.
7. As Sam, I want IMAP emails to become cards with subject/sender context and avoid duplicate entries.

## 5. Functional Requirements
### 5.1 Capture
- `/capture` endpoint accepts `{ ownerId, boardId, columnId?, text, source?, metadata? }` + token header; writes card to Input column (or provided column) and returns task payload.
- Web/PWA quick-add component with text box, optional voice dictation, board selector, offline queue (localStorage) + service worker caching.
- Browser extension (MV3) capturing active tab title+URL, configurable endpoint/token/owner/board.
- IMAP poller configured via env: connects to mailbox, fetches unseen messages, creates tasks (subject/from + 2k body preview), marks emails seen to dedupe.

### 5.2 GTD Board & Clarification
- Default columns: Input, Define Next Actions, Context lanes (Email, Meetings, Phone, Desk, Read/Watch), Waiting For, Someday/Maybe, Won’t Do, Done.
- Each task fields: title, description, context, tags, project, waiting-for text, due date, metadata (links/email IDs), needs_breakdown flag, checklist.
- Clarification UI (future milestone) to ask: actionable? <2 min? context? waiting-on? etc., and move card accordingly.

### 5.3 Owner & Projects
- `/users` endpoints (list, register, get) returning user meta + boards.
- Registering a user seeds default board and columns.
- Web UI Owner Selector lists existing users, allows inline registration, and reloads boards automatically.

### 5.4 Realtime Updates
- Socket.IO namespace `/boards`; clients join boards and receive `board:update` events on task create/update (including capture pipeline events).
- Frontend hook reconnects automatically and re-fetches board data on updates.

### 5.5 Automation & Events (concept groundwork)
- Prisma schema includes TaskEvent table with event types (created, moved, completed, stale, rule_triggered).
- Capture + task services emit TaskEvent entries to support analytics/rules.
- Worker module is BullMQ-ready; currently hosts QuickTaskService + IMAP poller.

## 6. Non-Functional Requirements
- Self-host deployment target: Docker Compose stack (Postgres, Redis, Mailhog, MinIO) + containerized API/worker/web.
- Security: `CAPTURE_ACCESS_TOKEN` protecting capture endpoint; IMAP credentials stored in env; CORS limited to configured frontends.
- Performance: WebSocket updates <200ms, capture API <500ms typical, offline queue flush handles backlog sequentially.
- Reliability: IMAP poller dedupes via `\Seen`, capture queue stores pending payloads in localStorage when offline, service worker caches static assets.
- Observability: logging in worker (email processed), ready for BullMQ metrics (future).

## 7. UX Flows
1. **Owner onboarding:** user opens SPA → registers via Owner Selector → API seeds board → board grid & capture form show owner context → user can capture.
2. **Capture cycle:** user submits form or extension → `/capture` creates task → TaskEvent logged → Socket.IO emits update → board hook refreshes → user sees card in Input column.
3. **IMAP ingestion:** worker polls mailbox → unseen email -> QuickTaskService -> mark email seen -> log event (console) -> (future) notify board.
4. **Offline capture:** PWA form enqueues entry when API fails -> service worker/online event triggers flush -> once sync completes, board updates realtime.

## 8. Dependencies
- Node 20, pnpm 9, Postgres 14+, Redis 6+, ImapFlow, Socket.IO, React, NestJS, Prisma.
- Env tokens for capture, IMAP credentials, web origin config.

## 9. Risks & Mitigations
| Risk | Mitigation |
| --- | --- |
| IMAP duplicates or errors | Use `\Seen` flags, configurable poll interval, log failures |
| Capture endpoint abuse | Token-based header, future rate limiting |
| Offline queue overflow | Cap stored entries (future), show status message |
| WebSocket disconnects | Auto-rejoin logic in `useBoardRealtime` + board refresh fallback |

## 10. Success Metrics
- Time to capture: <5s from submission to card visible on board.
- Capture reliability: >99% of attempted captures recorded or queued offline.
- Realtime freshness: board updates visible within 200ms when API writes succeed.
- IMAP ingest accuracy: zero duplicate cards for same email (via seen flag).
- User onboarding: 1-click registration produces working board with no manual UUID steps.
