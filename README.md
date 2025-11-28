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

## Next Steps / Customization

- Extend `TaskService`, automation rules, or analytics modules for deeper GTD insights.
- Enable HTTPS + reverse proxy (Caddy/Nginx) for production deployments.
- Wire BullMQ queues (e.g., via Redis) for rule execution, recurring templates, and metrics snapshots.
- Replace placeholder tests with real API/UI suites when ready—scripts are already wired for Jest/Vitest.

For any questions or contributions, open an issue or PR. Happy self-hosting! 🚀
