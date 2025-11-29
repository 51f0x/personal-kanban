# BullMQ Integration - Quick Start Guide

## ✅ Implementation Complete!

The integration is ready. Here's what you need to do:

## 1. Install Dependencies

**API** needs BullMQ packages:
```bash
cd apps/api
pnpm add @nestjs/bullmq bullmq
```

## 2. Environment Variables

Add to your `.env` file:
```env
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:3000
```

## 3. Start Services

```bash
# Terminal 1: Start Redis
docker-compose up redis

# Terminal 2: Start API
pnpm --filter @personal-kanban/api dev

# Terminal 3: Start Worker  
pnpm --filter @personal-kanban/worker dev
```

## 4. Test It

1. Capture a task with a URL:
   ```
   Read article https://example.com/article
   ```

2. Watch the flow:
   - API queues job
   - Worker picks up job
   - Worker processes with agents
   - Progress updates appear in real-time
   - Hints are created automatically

3. Check hints:
   - Open task detail modal
   - Hints panel should show all agent suggestions

## How It Works

1. **API** queues BullMQ job → Redis
2. **Worker** picks up job → Processes with agents
3. **Worker** sends progress → HTTP callbacks to API
4. **API** broadcasts progress → WebSocket to frontend
5. **Hints created** → Automatically in database

## Files Changed

- ✅ API: Queue service, progress controller
- ✅ Worker: Job processor
- ✅ Both: Updated modules

Everything is ready! Just install dependencies and start services.

