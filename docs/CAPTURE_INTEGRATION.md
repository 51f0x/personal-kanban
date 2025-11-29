# Capture Integration with Agent Orchestrator

This document describes how the capture system integrates with the agent orchestrator to process tasks with real-time WebSocket progress updates.

## Overview

When text is captured from the Home page, the system now:

1. Creates the task immediately (returns to user)
2. Triggers agent processing in the background
3. Broadcasts progress updates via WebSocket in real-time
4. Shows users what's happening as the task is processed

## Flow

```
User submits text from Home page
  ↓
CaptureController receives request
  ↓
CaptureService creates task
  ↓
AgentCaptureService.processTaskWithAgentsAsync() (background)
  ↓
AgentProgressService broadcasts progress via WebSocket
  ↓
Frontend receives progress updates and shows to user
```

## Implementation

### 1. Capture Service Integration

The `CaptureService` now automatically triggers agent processing after creating a task:

```typescript
// In capture.service.ts
const task = await this.taskService.createTask({...});

// Trigger agent processing in background with WebSocket callbacks
this.agentCaptureService.processTaskWithAgentsAsync(task.id, board.id);

return task;
```

### 2. Agent Capture Service

The `AgentCaptureService` handles:

- Creating WebSocket progress callbacks
- Detecting URLs in captured tasks
- Triggering agent processing
- Broadcasting progress updates

```typescript
// Creates progress callback that broadcasts via WebSocket
const onProgress = this.agentProgressService.createProgressCallback(taskId, boardId);

// Processes task with agents (triggers real agent orchestrator)
await processTaskWithAgents(taskId, boardId, onProgress);
```

### 3. Progress Broadcasting

Progress updates are automatically broadcast to all connected clients on the board:

```typescript
// AgentProgressService creates callback
const callback = agentProgressService.createProgressCallback(taskId, boardId);

// This callback automatically emits WebSocket events
callback({
  stage: 'downloading-content',
  progress: 20,
  message: 'Downloading content from: https://...',
});
```

## Frontend Integration

### Listening for Progress Updates

The frontend can listen for progress updates via WebSocket:

```typescript
socket.on('board:update', (event) => {
  if (event.type === 'agent.progress' && event.taskId === currentTaskId) {
    const { stage, progress, message, details } = event.progress;
    
    // Update UI
    setProgress(progress);
    setStatus(message);
    
    // Show loading indicator
    if (stage === 'downloading-content') {
      showDownloadingIndicator();
    }
  }
});
```

### Example Progress UI Component

```tsx
function AgentProgressIndicator({ taskId, boardId }) {
  const [progress, setProgress] = useState(null);
  
  useEffect(() => {
    const socket = io(`${WS_URL}/boards`);
    socket.emit('join', { boardId });
    
    socket.on('board:update', (event) => {
      if (event.type === 'agent.progress' && event.taskId === taskId) {
        setProgress(event.progress);
      }
    });
    
    return () => socket.disconnect();
  }, [taskId, boardId]);
  
  if (!progress) return null;
  
  return (
    <div className="agent-progress">
      <div className="progress-bar" style={{ width: `${progress.progress}%` }} />
      <div className="progress-message">{progress.message}</div>
      {progress.stage === 'error' && (
        <div className="error">{progress.details?.error}</div>
      )}
    </div>
  );
}
```

## Progress Stages

Users will see progress updates at these stages:

1. **Initializing** (0%) - "Starting agent processing..."
2. **Detecting URL** (10%) - "Detecting URLs in task..."
3. **Downloading Content** (20%) - "Downloading content from: https://..."
4. **Extracting Text** (30%) - "Extracting text content..."
5. **Summarizing** (40-50%) - "Summarizing content..." → "Content summarized"
6. **Analyzing** (60-70%) - "Analyzing task..." → "Task analysis completed"
7. **Extracting Context** (80%) - "Extracting context and tags..."
8. **Extracting Actions** (90%) - "Extracting actionable items..."
9. **Applying Results** (95%) - "Applying agent results to task..."
10. **Completed** (100%) - "Agent processing completed successfully"

## Current Implementation Status

### ✅ Implemented

- Capture service triggers agent processing after task creation
- WebSocket progress broadcasting
- Progress callback infrastructure
- Type definitions for progress updates
- Error handling and logging

### 🔄 In Progress

- Full integration with worker's AgentOrchestrator
- Currently using simplified progress simulation
- Need to connect to actual agent processing pipeline

### 📋 TODO

1. **Connect to Real Agent Orchestrator**

   Options:
   - Use BullMQ to queue agent processing jobs
   - Make HTTP call to worker service endpoint
   - Share agent orchestrator via common package
   - Move orchestrator to shared location

2. **Enhanced Progress Updates**

   - Show actual content download progress
   - Display summary preview
   - Show extracted tags/actions in real-time

3. **Error Recovery**

   - Retry failed agent processing
   - Show error details to users
   - Allow manual retry

## Integration with Worker Service

### Option 1: BullMQ Job Queue (Recommended)

```typescript
// In AgentCaptureService
async processTaskWithAgentsAsync(taskId: string, boardId: string) {
  // Create progress callback
  const callback = this.agentProgressService.createProgressCallback(taskId, boardId);
  
  // Queue job for worker to process
  await this.agentProcessingQueue.add({
    taskId,
    boardId,
    onProgress: callback, // Pass callback via job data
  });
}
```

### Option 2: HTTP Call to Worker

```typescript
// Create endpoint in worker service
POST /api/v1/agents/tasks/:taskId/process
Body: { onProgressCallbackUrl?: string }

// Worker calls back to API to emit progress
```

### Option 3: Shared Package

Move agent orchestrator to a shared package that both API and worker can use.

## Benefits

1. **Real-time Feedback** - Users see progress immediately
2. **Transparency** - Clear indication of what's happening
3. **Better UX** - Reduces perceived wait time
4. **Error Visibility** - Errors shown immediately with context
5. **Non-blocking** - Task creation is immediate, processing happens in background

## Testing

To test the integration:

1. Submit text with a URL from the Home page
2. Check WebSocket events in browser console
3. Verify progress updates are received
4. Confirm task is updated after processing completes

## Next Steps

1. Complete integration with worker's AgentOrchestrator
2. Add frontend UI component to show progress
3. Test with real URLs and content
4. Add error handling UI
5. Performance optimization

