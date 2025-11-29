# Agent Processing Integration Setup

## Summary

Agent processing has been integrated via BullMQ job queue. The API queues jobs, and the worker processes them asynchronously.

## Required Dependencies

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

Install:
```bash
cd apps/api
pnpm add @nestjs/bullmq bullmq
```

### Worker

Already has all required dependencies.

## Configuration

Add to `.env`:
```env
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:3000
```

## Files Created/Modified

### API
- ✅ `apps/api/src/modules/agents/agent-queue.module.ts` - BullMQ queue module
- ✅ `apps/api/src/modules/agents/agent-queue.service.ts` - Queue service
- ✅ `apps/api/src/modules/agents/agent-progress.controller.ts` - Progress callback endpoint
- ✅ `apps/api/src/modules/agents/agents.module.ts` - Updated to include queue
- ✅ `apps/api/src/modules/capture/agent-capture.service.ts` - Updated to use queue

### Worker
- ✅ `apps/worker/src/modules/agents/agent-job.processor.ts` - Job processor
- ✅ `apps/worker/src/modules/agents/agents.module.ts` - Updated to include processor
- ✅ `apps/worker/src/shared/config.module.ts` - Added API_URL config

## Flow

1. Task captured → API queues BullMQ job
2. Worker picks up job → Processes with agents
3. Worker sends progress → HTTP callbacks to API
4. API broadcasts progress → WebSocket to clients
5. Hints created → Automatically in database

## Next Steps

1. Install BullMQ dependencies in API
2. Run `npx prisma generate` to update types
3. Start Redis, API, and Worker
4. Test by capturing a task with URL

