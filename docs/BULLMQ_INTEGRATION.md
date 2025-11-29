# BullMQ Integration for Agent Processing

## Overview

Agent processing is now integrated via BullMQ job queue. The API queues jobs, and the worker processes them asynchronously with real-time progress updates.

## Architecture

```
API Service                    Redis Queue              Worker Service
┌─────────────┐              ┌─────────────┐          ┌─────────────┐
│             │              │             │          │             │
│ AgentCapture│──queue job──>│  BullMQ     │<──read──│ AgentJob    │
│ Service     │              │  Queue      │          │ Processor   │
│             │              │             │          │             │
│             │              └─────────────┘          │             │
│             │                                       │             │
│             │<──HTTP callback──┐                    │             │
│             │  (progress)      │                    │             │
│             │                  │                    │             │
│             │                  │                    │             │
│ WebSocket   │                  │                    │             │
│ Broadcast   │                  │                    │             │
│             │                  │                    │             │
│  ┌────────┐ │                  │                    │             │
│  │Progress│ │                  │                    │             │
│  │Endpoint│<┘                  │                    │             │
│  └────────┘ │                  │                    │             │
└─────────────┘                  └────────────────────┘             │
```

## Components

### API Side

1. **AgentQueueService** (`apps/api/src/modules/agents/agent-queue.service.ts`)
   - Queues agent processing jobs
   - Uses BullMQ to add jobs to `agent-processing` queue

2. **AgentProgressController** (`apps/api/src/modules/agents/agent-progress.controller.ts`)
   - Receives HTTP callbacks from worker with progress updates
   - Broadcasts progress via WebSocket

3. **AgentCaptureService** (updated)
   - Queues jobs instead of simulating
   - Provides initial progress feedback

### Worker Side

1. **AgentJobProcessor** (`apps/worker/src/modules/agents/agent-job.processor.ts`)
   - Processes jobs from `agent-processing` queue
   - Calls `TaskProcessorService` to run agents
   - Sends progress updates via HTTP callbacks to API

2. **TaskProcessorService** (already exists)
   - Processes tasks with agents
   - Creates hints automatically
   - Supports progress callbacks

## Flow

1. **Task Captured**:
   - API receives capture request
   - Creates task
   - `AgentCaptureService.processTaskWithAgentsAsync()` called

2. **Job Queued**:
   - Checks if task has URL
   - If URL found, queues BullMQ job with:
     - `taskId`
     - `boardId`
     - `progressCallbackUrl` (API endpoint)

3. **Worker Processes**:
   - Worker picks up job from queue
   - Creates progress callback that sends HTTP requests to API
   - Runs all agents:
     - Web Content Agent
     - Content Summarizer
     - Task Analyzer
     - Context Extractor
     - Action Extractor
   - Creates hints from results
   - Sends progress updates via HTTP callbacks

4. **Progress Broadcast**:
   - API receives progress callbacks
   - Broadcasts via WebSocket to connected clients
   - Frontend displays real-time progress

5. **Completion**:
   - Worker completes processing
   - Hints are created in database
   - Final progress update sent
   - Job marked as completed

## Configuration

### API Environment Variables

```env
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:3000  # For progress callback URLs
```

### Worker Environment Variables

```env
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:3000  # For HTTP callbacks
DATABASE_URL=postgresql://...
LLM_ENDPOINT=http://localhost:11434
```

## Dependencies Required

### API (`apps/api/package.json`)

Add these dependencies:
```json
{
  "dependencies": {
    "@nestjs/bullmq": "^10.2.0",
    "bullmq": "^5.7.11"
  }
}
```

### Worker (`apps/worker/package.json`)

Already has:
- `@nestjs/bullmq`
- `bullmq`

## API Endpoints

### Progress Callback Endpoint

```
POST /api/v1/agents/progress/update
Body: {
  taskId: string;
  stage: string;
  progress: number;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
```

## Queue Details

- **Queue Name**: `agent-processing`
- **Job ID Format**: `agent-processing-{taskId}`
- **Retries**: 3 attempts with exponential backoff
- **Job Data**:
  - `taskId`: Task to process
  - `boardId`: Board ID for WebSocket broadcasting
  - `progressCallbackUrl`: API endpoint for progress updates

## Benefits

1. **Decoupled**: API and worker are independent
2. **Scalable**: Multiple workers can process jobs in parallel
3. **Reliable**: BullMQ provides job persistence and retries
4. **Real-time**: Progress updates via WebSocket
5. **Non-blocking**: API doesn't wait for agent processing

## Testing

1. Start Redis: `docker-compose up redis`
2. Start API: `pnpm --filter @personal-kanban/api dev`
3. Start Worker: `pnpm --filter @personal-kanban/worker dev`
4. Capture task with URL
5. Check Redis queue: Jobs should appear in `agent-processing` queue
6. Worker should process and create hints

## Troubleshooting

### Jobs Not Processing

- Check Redis connection in both API and worker
- Verify worker is running and connected to Redis
- Check worker logs for errors

### Progress Not Updating

- Verify `API_URL` is set correctly in worker
- Check API logs for incoming progress callbacks
- Verify WebSocket connections

### Hints Not Created

- Check worker logs for errors
- Verify `TaskProcessorService` is calling `hintService.createHintsFromResults()`
- Check database for Hint records

