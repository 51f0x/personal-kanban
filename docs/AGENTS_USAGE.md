# Using Agent Progress Callbacks

## Quick Start Example

Here's a complete example of using agent progress callbacks to show real-time updates to users:

```typescript
import { AgentOrchestrator } from './modules/agents/agent-orchestrator.service';
import type { AgentProcessingProgress } from './modules/agents/types';

// Create a progress callback
const onProgress = (progress: AgentProcessingProgress) => {
  console.log(`[${progress.stage}] ${progress.progress}% - ${progress.message}`);
  
  // Update UI, send WebSocket message, etc.
  if (progress.details) {
    console.log('Details:', progress.details);
  }
};

// Process task with progress updates
const results = await agentOrchestrator.processTask(taskId, {
  onProgress,
});

// Results include full progress history
console.log('Total progress updates:', results.progress?.length);
```

## Integration with WebSocket

To broadcast progress to connected clients:

```typescript
import { AgentProgressService } from './modules/agents/agent-progress.service';

// In your service
constructor(
  private readonly agentOrchestrator: AgentOrchestrator,
  private readonly progressService: AgentProgressService,
) {}

async processTaskWithUpdates(taskId: string, boardId: string) {
  // Create callback that broadcasts via WebSocket
  const onProgress = this.progressService.createProgressCallback(
    taskId,
    boardId
  );
  
  // Process with progress updates
  const results = await this.agentOrchestrator.processTask(taskId, {
    onProgress,
  });
  
  // Apply results with progress updates
  await this.agentOrchestrator.applyResultsToTask(taskId, results, {
    updateTask: true,
    onProgress,
  });
  
  return results;
}
```

## Progress Stages

The callback receives updates at these stages:

- `initializing` (0%) - Processing started
- `detecting-url` (10%) - Looking for URLs
- `downloading-content` (20%) - Fetching web content
- `extracting-text` (30%) - Parsing HTML
- `summarizing-content` (40-50%) - Creating summary
- `analyzing-task` (60-70%) - Task analysis
- `extracting-context` (80%) - Context extraction
- `extracting-actions` (90%) - Action extraction
- `applying-results` (0-100%) - Saving to task
- `completed` (100%) - Finished
- `error` - Error occurred

## Real-World Example

In a capture endpoint:

```typescript
@Post('capture')
async captureTask(@Body() dto: CaptureRequestDto) {
  // Create task
  const task = await this.captureService.quickAdd(dto);
  
  // Process with agents in background (don't wait)
  this.processWithAgentsAsync(task.id, task.boardId).catch(console.error);
  
  return task;
}

private async processWithAgentsAsync(taskId: string, boardId: string) {
  const onProgress = this.progressService.createProgressCallback(
    taskId,
    boardId
  );
  
  await this.taskProcessor.processTaskWithAgents(taskId, {
    updateTask: true,
    onProgress,
  });
}
```

