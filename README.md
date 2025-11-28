# Personal Kanban + GTD Platform

A self-hosted productivity cockpit that blends GTD workflows with a configurable Kanban board, built-in capture pipelines (web/PWA, browser extension, voice, IMAP), automation scaffolding, and LeanKit-style analytics. Everything runs on infrastructure you own—no reliance on third-party automation tools.

---

## Features

- **GTD-aligned Kanban:** Default columns for Input, Next Actions, Context lanes, Waiting, Someday, and Done with WIP enforcement.
- **Quick capture everywhere:** Web/PWA form with offline queue + browser speech recognition, token-protected `/capture` API, browser extension, and an IMAP poller that turns emails into cards.
- **Realtime updates:** Socket.IO gateway pushes task events to connected boards; the SPA automatically refreshes as cards are added or edited.
- **Automation-ready backend:** Prisma data model, TaskEvents, and a worker foundation (BullMQ-ready) to extend with rules, recurring templates, and analytics.
- **Owner onboarding:** REST endpoints and UI flow to register/list users so no UUID copy/paste is required.

---

## Tech Stack

- **Backend:** NestJS (REST/WebSocket), Prisma ORM, Postgres (via Docker compose), BullMQ-ready worker with ImapFlow integration.
- **Frontend:** React + Vite + TypeScript, Socket.IO client, PWA enhancements (service worker, offline capture queue).
- **Worker:** Node/Nest context for background jobs (capture/IMAP ingestion today; rules/automation later).
- **Tooling:** pnpm workspaces, ESLint/Prettier, Vitest/Jest, Dockerfiles for API/worker/web, GitHub Actions-ready CI config.

---

## Getting Started

### 1. Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres/Redis/Mailhog/MinIO via `docker-compose.yml`)

### 2. Install dependencies

```bash
pnpm install
```

### 3. Provision infrastructure

```bash
docker compose up -d postgres redis mailhog minio
```

### 4. Environment variables

Copy `.env.example` to `.env` (and `.env.local` / `.env.worker` if needed) and customize:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string for queues |
| `CAPTURE_ACCESS_TOKEN` | Shared secret for `/capture` HTTP token |
| `IMAP_*` | Host, credentials, defaults for IMAP ingestion |
| `VITE_API_URL`, `VITE_WS_URL`, `VITE_CAPTURE_TOKEN` | Frontend env (`apps/web/.env.example`) |

### 5. Run the stack (dev)

Use individual dev servers for clearer logs:

```bash
# API
pnpm --filter @personal-kanban/api dev

# Worker (queues/IMAP)
pnpm --filter @personal-kanban/worker dev

# Web SPA
pnpm --filter @personal-kanban/web dev
```

Or build and run Docker images (`docker/Dockerfile.*`) and wire them up with `docker-compose.yml` once you’re ready for self-hosting.

---

## Usage Guide

### Owner onboarding
1. Open `apps/web` dev server (default `http://localhost:5173`).
2. Use the **Owner Selector** panel to register a new user (name + email). The API seeds a starter board/columns automatically.
3. Select the owner from the dropdown; the board grid will load via `/api/v1/boards?ownerId=<id>`.

### Capture flows

| Capture path | What to do |
| --- | --- |
| **Web/PWA quick add** | Use the “Quick capture” card on the landing page. It supports plain text, URLs, offline queueing, and optional voice dictation (browser Web Speech API). |
| **Browser extension** | Load `extensions/quick-capture` into your Chromium browser in developer mode. Configure endpoint/token/board/owner in the options page. Clicking the extension sends the current tab title+URL to `/capture`. |
| **HTTP API** | `POST /api/v1/capture` with JSON body `{ ownerId, boardId, columnId?, text, source?, metadata? }` and header `x-capture-token: <CAPTURE_ACCESS_TOKEN>`. |
| **IMAP ingestion** | Set `IMAP_*` env vars and run the worker. Unseen emails in the target mailbox are converted into cards (subject+sender+body preview), then marked seen to avoid duplicates. |

All capture paths create a task, mark it for breakdown, emit a `task.created` websocket event, and drop it into the Input column (or specified column).

### Realtime board updates

The frontend opens a Socket.IO connection to `VITE_WS_URL/boards` and automatically joins every loaded board. Task mutations (including captures) trigger `board:update` events so the UI refreshes without manual polling. To hook into this elsewhere, inject `BoardGateway` and call `emitBoardUpdate(boardId, payload)`.

### Voice capture tips

- Works in browsers supporting `SpeechRecognition`/`webkitSpeechRecognition` (Chrome, Edge).
- Click “Voice capture” to start dictation, “Stop dictation” to finish, and we append the transcript to your typed text before submitting.

---

## Testing & Validation

- Lint everything: `pnpm lint`
- Run tests: `pnpm test`
  - `apps/worker` includes an IMAP poller spec (`src/modules/integrations/__tests__/imap.poller.spec.ts`) that verifies unseen email processing and dedupe guards.
  - APIs/web currently have no suites; scripts pass with informative messages (`--passWithNoTests`) so CI can still run consistently.

---

## Project Structure (key folders)

```
apps/
  api/         # NestJS REST/WebSocket server
  worker/      # Background jobs (BullMQ/IMAP/etc.)
  web/         # React PWA front-end
packages/
  shared/      # Shared TypeScript interfaces/utilities
extensions/
  quick-capture/ # Browser extension for capture
prisma/        # Prisma schema + migrations
docker/        # Dockerfiles for api/worker/web
```

---

## API Endpoints

### Core Endpoints
| Method | Path | Description |
| --- | --- | --- |
| GET | /api/v1/health | Health check |
| GET | /api/v1/health/ready | Readiness probe (DB + Redis) |
| GET | /api/v1/health/live | Liveness probe |
| GET | /api/v1/users | List users |
| POST | /api/v1/users/register | Register user + seed board |
| GET | /api/v1/boards | List boards for owner |
| GET | /api/v1/boards/:id | Get board with columns |
| GET | /api/v1/boards/:id/tasks | List tasks for board |
| POST | /api/v1/tasks | Create task |
| PATCH | /api/v1/tasks/:id | Update task |
| POST | /api/v1/tasks/:id/move | Move task with WIP validation |
| DELETE | /api/v1/tasks/:id | Delete task |

### Clarification (GTD Wizard)
| Method | Path | Description |
| --- | --- | --- |
| GET | /api/v1/boards/:id/clarify/next | Get next unclarified task |
| POST | /api/v1/tasks/:id/clarify | Apply GTD clarification |
| GET | /api/v1/boards/:id/clarify/stats | Clarification statistics |

### Automation Rules
| Method | Path | Description |
| --- | --- | --- |
| GET | /api/v1/boards/:id/rules | List rules |
| POST | /api/v1/boards/:id/rules | Create rule |
| PATCH | /api/v1/rules/:id | Update rule |
| POST | /api/v1/rules/:id/toggle | Enable/disable |
| DELETE | /api/v1/rules/:id | Delete rule |

### Recurring Templates
| Method | Path | Description |
| --- | --- | --- |
| GET | /api/v1/boards/:id/templates | List templates |
| POST | /api/v1/boards/:id/templates | Create template |
| POST | /api/v1/templates/:id/skip | Skip next occurrence |
| POST | /api/v1/templates/:id/run | Run now |

### Analytics
| Method | Path | Description |
| --- | --- | --- |
| GET | /api/v1/boards/:id/analytics/summary | Board summary |
| GET | /api/v1/boards/:id/analytics/cfd | CFD data |
| GET | /api/v1/boards/:id/analytics/throughput | Throughput metrics |
| GET | /api/v1/boards/:id/analytics/lead-cycle | Lead/cycle times |
| GET | /api/v1/boards/:id/analytics/stale | Stale tasks |
| GET | /api/v1/boards/:id/analytics/wip-breaches | WIP breaches |

---

## Next Steps / Customization

- **Board UI**: Install @dnd-kit for drag-and-drop Kanban board interface
- **Worker Processors**: Implement BullMQ processors for rule execution and template scheduling
- **Full Authentication**: Add session/JWT-based auth with user passwords
- Enable HTTPS + reverse proxy (Caddy/Nginx) for production deployments
- Replace placeholder tests with comprehensive test suites

For any questions or contributions, open an issue or PR. Happy self-hosting! 🚀

---

## Concept at a Glance

This project recreates the GTD-centric LeanKit workflow described in the Medium article, but as a fully self-owned platform:

1. **One capture funnel:** Every idea, email, reminder, link, or voice note funnels into the Input column via quick-capture surfaces (web/PWA, browser extension, IMAP, `/capture` API). No third-party automation services are required.
2. **Clarify once, work contextually:** Cards flow through GTD lanes—define next actions, mark “waiting on”, park in Someday/Maybe, or drop into context lanes (Email, Calls, Meetings, Desk, Read/Watch). WIP indicators keep focus tight.
3. **Automatable nervous system:** Prisma models, TaskEvents, and BullMQ-ready workers allow IFTTT/Zapier-style rules, recurring templates (weekly review, daily check-ins), stale detection, and analytics (CFD, lead/cycle time).
4. **Self-hosted transparency:** Dockerized stack with NestJS/React/Redis/Postgres, realtime Socket.IO updates, IMAP/SMPP connectors, and PWA/offline-first capture gives you complete control over data, automation, and deployment environment.

Think of it as “Personal Kanban + GTD + native automation glue,” purpose-built for single owners or small teams who want LeanKit-style flow metrics and capture reliability without renting SaaS automation tools.
