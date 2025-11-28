# Personal Kanban + GTD Platform PRD

## 1. Overview
A self-hosted productivity cockpit that merges Getting Things Done (GTD) principles with Kanban execution, realtime collaboration, and built-in automation. Targets individuals or small teams who want LeanKit-style visibility and automation without SaaS dependencies. Core promise: capture everything, clarify once, work by context, and trust the system because you own every component.

## 2. Goals & Non-Goals
### Goals
1. **Single capture funnel:** every input (web, mobile PWA, extension, voice dictation, IMAP, HTTP API) produces a card in the Input column with consistent metadata (raw text, source, optional links).
2. **Guided GTD clarification:** provide a triage surface that mirrors the GTD flowchart (actionable? <2 min? context? waiting on? someday?) and updates board state exactly once per item.
3. **Context-first execution:** boards expose configurable columns/lanes, WIP limits, filters by context/project/tag, and realtime updates so users can work from the lane that matches their current environment.
4. **Automation-ready foundation:** persist TaskEvents, support recurring template engine, detect stale cards, and prepare for full rules engine (triggers + conditions + actions).
5. **Self-hosted ownership:** run entirely on user infrastructure via Docker (Postgres, Redis, Mailhog, MinIO) with NestJS/React/BullMQ stack; no SaaS connectors required.

### Non-Goals (v1)
- Multi-tenant SaaS. Focus is a single deployer (individual or household/small team).
- Native iOS/Android apps (PWA + responsive web cover mobile capture; native wrappers can follow later).
- Full analytics suite (future milestone for CFD, lead/cycle scatter plots, Monte Carlo forecasting).
- External automation connectors (Zapier/IFTTT) since the product aims to replace them internally.

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
- **HTTP capture endpoint**: `POST /api/v1/capture` accepts `{ ownerId, boardId, columnId?, text, source?, metadata? }` and `x-capture-token` header. Validates ownership, resolves Input column if none provided, creates task with `needs_breakdown = true`, logs TaskEvent, emits realtime update, and returns the persisted task.
- **Web/PWA quick-add**: a form with text area, board selector, owner-driven context, optional voice dictation (Web Speech API), offline queue (pending payloads stored in `localStorage`), and service worker to enable caching + flush-on-online. Shows success/error banners, indicates when capture is queued vs. synced.
- **Voice capture**: toggle button starts/stops SpeechRecognition; transcripts appended to typed text before submission; fallback for unsupported browsers.
- **Browser extension (MV3)**: manifest + service worker gather active tab title + URL, read stored settings (endpoint/token/board/owner), send `POST /capture`. Options page allows user to edit settings. Future: context-menu capture.
- **IMAP poller**: worker uses ImapFlow to connect to configured mailbox, open `IMAP_MAILBOX` (default INBOX), search unseen messages, fetch envelope/source, convert to tasks with `subject/from/raw` metadata, mark messages `\Seen` to dedupe, log throughput. Poll interval (`IMAP_POLL_INTERVAL_MS`) default 60s; gracefully handles errors/backoff.
- **Offline queue**: when fetch fails or user offline, payload enqueued with UUID and stored; `window.online` event triggers flush attempts; users notified of queued vs synced states.

### 5.2 GTD Board & Clarification
- **Board schema**: columns with `type` enum (input, clarify, context, waiting, someday, done, archive), `wipLimit`, `position`.
- **Tasks**: title, description, context (enum), tags, project, waiting_for text, due date, metadata JSON (links/email IDs), `needs_breakdown`, `checklist`, `lastMovedAt`, `stale`.
- **Clarification UI** (planned): sequential prompts mirror GTD chart and output moves to appropriate column. Additional data captured: next action text, waiting-on person, due date. Should allow keyboard-only navigation for rapid triage.
- **Context execution**: board view highlight lane-specific tasks; filters for Email/Meetings/Phone/Desk/Read; WIP indicators (visual + toast when exceeded). Provide “Stale” filter to show cards untouched for >7 days.

### 5.3 Owner & Projects
- `/users` endpoints: list existing users, fetch by ID, register new user. Register seeds default board with Input/Next Actions/In Progress/Done + contexts, returning board/column IDs so UI can set current owner automatically.
- SPA “Owner Selector” shows dropdown of existing users and inline registration form (name/email/timezone). After registration, new owner is selected, boards fetched automatically, capture form ready.
- Projects: service already exists; UI (future) shows project filter and dedicated view (tasks grouped by project).

### 5.4 Realtime Updates
- Socket.IO namespace `/boards`. Clients join rooms per board ID via handshake query or explicit `join` event. Server logs joins/disconnects for observability.
- TaskService emits `board:update` events when tasks are created/updated (including capture pipeline). Payload includes event `type`, `taskId`, `timestamp`.
- Frontend `useBoardRealtime` hook maintains connection, re-joins boards after reconnect, and triggers board refresh (REST fetch) when update events arrive.
- Future: differentiate event types (task moved, column WIP breach, stale detection) for more granular UI updates.

### 5.5 Automation & Events (foundation)
- Prisma `TaskEvent` table includes type, from/to columns, payload JSON, timestamp, triggeredBy. Every capture + task update writes to TaskEvent to support analytics/rules.
- Recurring template + scheduler (future) will rely on same event stream; worker already structured for BullMQ queue integration.
- Worker module currently houses QuickTaskService + Imap poller; architecture allows adding queue processors for rules engine, stale detection, analytics snapshots.

## 6. Non-Functional Requirements
- **Deployment:** Docker Compose orchestrates Postgres, Redis, Mailhog, MinIO, API, worker, web. Production guidance: reverse proxy (Caddy/Nginx), TLS, env secrets per service.
- **Security:** Capture endpoint protected by `CAPTURE_ACCESS_TOKEN`. Owner registration requires email (future: optional verification). CORS limited to configured frontend origin. IMAP credentials stored only in env; encourage .env file permissions.
- **Performance:** WebSocket broadcast <200ms from task commit. Capture request <500ms 95th percentile. IMAP poller processes at least 1 email/sec, limited by network.
- **Reliability:** Offline queue ensures no capture lost when network down. IMAP dedupe via `\Seen`, optional message-id tracking later. Service worker caches essential assets for PWA offline readiness.
- **Observability:** Worker logs counts of processed emails; plan to expose Prometheus metrics (queue depth, poll latency). TaskEvents provide audit trail for card history.
- **Availability:** expectation 99% uptime for single-node deployment; future docs for HA (Postgres WAL, Redis persistence, multi-worker scaling).

## 7. UX Flows
1. **Owner onboarding:** user opens SPA → Owner Selector loads `/users` → user either selects existing owner or submits registration (name/email/timezone) → API seeds board + returns owner data → board grid + capture form auto-refresh for that owner.
2. **Capture cycle:** user types or voice-dictates in quick capture form → payload submitted to `/capture` with token → API validates & creates task in Input column → TaskEvent recorded → WebSocket `board:update` broadcast → `useBoardRealtime` triggers `refresh()` → card visible on board, message shows success. If offline, payload added to queue with notice; queue flush triggers success message later.
3. **Extension capture:** user clicks extension icon → background script collects tab data → sends to `/capture` with stored token/owner/board → same event flow updates board.
4. **IMAP ingestion:** worker polls mailbox (interval) → fetch unseen -> create tasks -> mark emails seen -> (future) push `board:update` via message bus.
5. **Offline capture flush:** service worker or `window.online` fires → offline queue iterates pending payloads → each `sendCapture()` attempt; successes removed, failures stay queued → board updates via realtime events or manual refresh.
6. **Weekly review (future)**: scheduler (BullMQ) injects Weekly Review task on Fridays with checklist referencing stale cards, Someday list, metrics page.

## 8. Dependencies
- Node 20, pnpm 9, Postgres 14+, Redis 6+, ImapFlow, Socket.IO, React, NestJS, Prisma.
- Env tokens for capture, IMAP credentials, web origin config.
- Browser support: modern Chromium/Firefox/Safari for PWA; voice capture limited to browsers providing SpeechRecognition API (Chrome/Edge). Service worker requires HTTPS or localhost.

## 9. Risks & Mitigations
| Risk | Mitigation |
| --- | --- |
| IMAP duplicates or errors | Use `\Seen` flags, configurable poll interval, log failures |
| Capture endpoint abuse | Token-based header, future rate limiting |
| Offline queue overflow | Cap stored entries (future), show status message |
| WebSocket disconnects | Auto-rejoin logic in `useBoardRealtime`, plus fallback manual refresh button |
| Missing analytics | TaskEvents retained for retroactive analytics; plan to add snapshots in WS7 milestone |
| Secrets exposure | Document secure env handling, encourage `.env` outside repo, mention Kubernetes secrets for prod |

## 10. Success Metrics
- Time to capture: <5s from submission to card visible on board.
- Capture reliability: >99% of attempted captures recorded or queued offline.
- Realtime freshness: board updates visible within 200ms when API writes succeed.
- IMAP ingest accuracy: zero duplicate cards for same email (via seen flag).
- User onboarding: 1-click registration produces working board with no manual UUID steps.
- Documentation completeness: README + PRD enable new operators to deploy + capture without external context.
