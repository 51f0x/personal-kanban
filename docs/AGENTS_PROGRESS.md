# Agent Progress Callbacks

The agent orchestrator supports callback functions that allow the system to show users the real-time state of items as they're being captured and analyzed before being put on the board.

## Overview

Progress callbacks provide real-time updates throughout the agent processing pipeline:

1. **Initializing** - Starting agent processing
2. **Detecting URL** - Looking for URLs in task
3. **Downloading Content** - Fetching web content
4. **Extracting Text** - Parsing HTML content
5. **Summarizing Content** - Creating summary with LLM
6. **Analyzing Task** - Running task analysis agents
7. **Extracting Context** - Extracting context and tags
8. **Extracting Actions** - Breaking down into actions
9. **Applying Results** - Saving results to task
10. **Completed** - Processing finished
11. **Error** - Error occurred

## Usage

### Basic Progress Callback

```typescript
import { AgentOrchestrator } from './modules/agents/agent-orchestrator.service';
import type { AgentProcessingProgress } from './modules/agents/types';

const onProgress = (progress: AgentProcessingProgress) => {
  console.log(`[${progress.stage}] ${progress.progress}% - ${progress.message}`);
  console.log('Details:', progress.details);
};

// Process task with progress updates
const results = await agentOrchestrator.processTask(taskId, {
  onProgress,
});
```

### WebSocket Integration

Use the `AgentProgressService` to broadcast progress to connected clients:

```typescript
import { AgentProgressService } from '../api/src/modules/agents/agent-progress.service';
import { TaskProcessorService } from './modules/agents/task-processor.service';

// In worker service
async processTaskWithRealTimeUpdates(taskId: string, boardId: string) {
  // Get progress service (may need to inject or access via API)
  const progressService = this.getAgentProgressService();
  
  // Create callback that broadcasts via WebSocket
  const onProgress = progressService.createProgressCallback(taskId, boardId);
  
  // Process task with progress callbacks
  await this.taskProcessorService.processTaskWithAgents(taskId, {
    updateTask: true,
    onProgress,
  });
}
```

### Frontend Integration

Listen for agent progress events on the frontend:

```typescript
import { useBoardRealtime } from '../hooks/useBoardRealtime';

function TaskCaptureView({ boardId, onProgress }) {
  useEffect(() => {
    const socket = io(`${WS_URL}/boards`);
    socket.emit('join', { boardId });
    
    socket.on('board:update', (event) => {
      if (event.type === 'agent.progress') {
        const { stage, progress, message, details } = event.progress;
        
        // Update UI with progress
        onProgress({
          stage,
          progress, // 0-100
          message,
          details,
        });
      }
    });
    
    return () => socket.disconnect();
  }, [boardId]);
}
```

## Progress Event Structure

```typescript
interface AgentProcessingProgress {
  taskId: string;
  stage: AgentProcessingStage;
  progress: number; // 0-100
  message: string;
  details?: {
    url?: string;
    contentLength?: number;
    summaryLength?: number;
    agentId?: string;
    error?: string;
    [key: string]: unknown;
  };
  timestamp: string;
}
```

## Example Progress Flow

When processing a task with a URL:

```
[initializing] 0% - Starting agent processing...
[detecting-url] 10% - Detecting URLs in task...
[downloading-content] 20% - Downloading content from: https://example.com/article
[extracting-text] 30% - Content downloaded (45231 characters)
[summarizing-content] 40% - Summarizing content (45231 characters)...
[summarizing-content] 50% - Content summarized (523 words)
[analyzing-task] 60% - Analyzing task with AI agents...
[analyzing-task] 70% - Task analysis completed
[extracting-context] 80% - Context extraction completed
[extracting-actions] 90% - Extracted 4 actions
[applying-results] 0% - Applying agent results to task...
[applying-results] 100% - Results applied successfully
[completed] 100% - Agent processing completed
```

## Integration Points

### During Task Capture

When a task is captured with a URL:

```typescript
// In capture service
async quickAdd(dto: CaptureRequestDto) {
  // Create task first
  const task = await this.taskService.createTask({...});
  
  // Process with agents in background with progress
  this.processTaskWithAgentsAsync(task.id, task.boardId);
  
  return task;
}

private async processTaskWithAgentsAsync(taskId: string, boardId: string) {
  // Use progress service to emit WebSocket updates
  const progressCallback = this.agentProgressService.createProgressCallback(
    taskId,
    boardId
  );
  
  await this.taskProcessorService.processTaskWithAgents(taskId, {
    updateTask: true,
    onProgress: progressCallback,
  });
}
```

### UI Progress Indicator

Show a progress indicator in the UI:

```tsx
function TaskCaptureProgress({ taskId, boardId }) {
  const [progress, setProgress] = useState<AgentProcessingProgress | null>(null);
  
  useBoardRealtime([boardId], () => {
    // Listen for progress updates
  });
  
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

## Benefits

1. **User Feedback** - Users see what's happening in real-time
2. **Transparency** - Clear indication of processing stages
3. **Error Visibility** - Errors are shown immediately
4. **Better UX** - Reduces perceived wait time
5. **Debugging** - Progress history stored in task metadata

## Error Handling

If a callback fails, processing continues:

```typescript
// In orchestrator
if (onProgress) {
  try {
    await onProgress(progressUpdate);
  } catch (callbackError) {
    this.logger.warn('Progress callback failed', callbackError);
    // Processing continues even if callback fails
  }
}
```

This ensures that callback errors don't interrupt agent processing.

