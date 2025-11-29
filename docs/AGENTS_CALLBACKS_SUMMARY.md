# Agent Progress Callbacks - Implementation Summary

## What Was Added

The agent orchestrator now supports callback functions that allow the system to show users the real-time state of items as they're being captured and analyzed before being put on the board.

## Key Features

### 1. Progress Callback Support

The `AgentOrchestrator.processTask()` method now accepts an optional `onProgress` callback:

```typescript
const results = await agentOrchestrator.processTask(taskId, {
  onProgress: (progress) => {
    // Show progress to user
    console.log(`${progress.progress}% - ${progress.message}`);
  },
});
```

### 2. Progress Stages

Progress updates are emitted at these stages:

- **initializing** (0%) - Processing started
- **detecting-url** (10%) - Looking for URLs in task
- **downloading-content** (20%) - Fetching web content
- **extracting-text** (30%) - Parsing HTML content  
- **summarizing-content** (40-50%) - Creating summary with LLM
- **analyzing-task** (60-70%) - Running task analysis
- **extracting-context** (80%) - Extracting context and tags
- **extracting-actions** (90%) - Breaking down into actions
- **applying-results** (0-100%) - Saving results to task
- **completed** (100%) - Processing finished
- **error** - Error occurred

### 3. Progress Information

Each progress update includes:

```typescript
{
  taskId: string;
  stage: AgentProcessingStage;
  progress: number;        // 0-100
  message: string;         // Human-readable status
  details?: {              // Additional context
    url?: string;
    contentLength?: number;
    summaryLength?: number;
    agentId?: string;
    error?: string;
    // ... more fields
  };
  timestamp: string;
}
```

### 4. Progress History

The full progress history is stored in the results:

```typescript
const results = await agentOrchestrator.processTask(taskId, { onProgress });
console.log(results.progress); // Array of all progress updates
```

## Integration Points

### WebSocket Broadcasting

Created `AgentProgressService` that can broadcast progress via WebSocket:

```typescript
// In API module
const progressCallback = agentProgressService.createProgressCallback(
  taskId,
  boardId
);

// This callback will automatically emit WebSocket events
await agentOrchestrator.processTask(taskId, {
  onProgress: progressCallback,
});
```

### Task Processor Integration

The `TaskProcessorService` now supports progress callbacks:

```typescript
await taskProcessorService.processTaskWithAgents(taskId, {
  updateTask: true,
  onProgress: (progress) => {
    // Handle progress
  },
});
```

### Apply Results Callback

Progress updates are also emitted when applying results:

```typescript
await agentOrchestrator.applyResultsToTask(taskId, results, {
  updateTask: true,
  onProgress: (progress) => {
    // Show progress during save
  },
});
```

## Example Flow

When a user captures a task with a URL:

1. **Initializing** (0%) - "Starting agent processing..."
2. **Detecting URL** (10%) - "Detecting URLs in task..."
3. **Downloading** (20%) - "Downloading content from: https://..."
4. **Extracting** (30%) - "Content downloaded (45231 characters)"
5. **Summarizing** (40-50%) - "Summarizing content..." → "Content summarized (523 words)"
6. **Analyzing** (60-70%) - "Analyzing task with AI agents..." → "Task analysis completed"
7. **Extracting Context** (80%) - "Context extraction completed"
8. **Extracting Actions** (90%) - "Extracted 4 actions"
9. **Applying** (0-100%) - "Applying agent results..." → "Results applied successfully"
10. **Completed** (100%) - "Agent processing completed"

## Usage Example

### Basic Usage

```typescript
const onProgress = (progress: AgentProcessingProgress) => {
  console.log(`[${progress.stage}] ${progress.progress}% - ${progress.message}`);
  
  // Update UI
  updateProgressBar(progress.progress);
  updateStatusMessage(progress.message);
  
  // Show details
  if (progress.details?.url) {
    console.log('Processing URL:', progress.details.url);
  }
};

await agentOrchestrator.processTask(taskId, { onProgress });
```

### With WebSocket

```typescript
// Automatically broadcasts to connected clients
const callback = agentProgressService.createProgressCallback(taskId, boardId);
await agentOrchestrator.processTask(taskId, { onProgress: callback });
```

### Frontend Integration

```typescript
socket.on('board:update', (event) => {
  if (event.type === 'agent.progress' && event.taskId === currentTaskId) {
    const { stage, progress, message, details } = event.progress;
    
    // Update UI
    setProgress(progress);
    setStatus(message);
    
    // Show loading indicator
    if (stage !== 'completed' && stage !== 'error') {
      showLoading();
    }
  }
});
```

## Files Modified

1. **`apps/worker/src/modules/agents/types.ts`**
   - Added `AgentProcessingStage` type
   - Added `AgentProcessingProgress` interface
   - Added `AgentProgressCallback` type
   - Updated `AgentProcessingResult` to include progress history

2. **`apps/worker/src/modules/agents/agent-orchestrator.service.ts`**
   - Added `onProgress` callback parameter to `processTask()`
   - Added progress emissions throughout processing pipeline
   - Added progress emissions to `applyResultsToTask()`

3. **`apps/worker/src/modules/agents/task-processor.service.ts`**
   - Added `onProgress` callback parameter support

4. **`apps/api/src/modules/agents/agent-progress.service.ts`** (NEW)
   - Service for broadcasting progress via WebSocket
   - Helper method to create progress callbacks

5. **`packages/shared/src/index.ts`**
   - Added `'agent.progress'` to `BoardUpdateType`

## Benefits

1. **Real-time Feedback** - Users see progress as it happens
2. **Transparency** - Clear indication of what's happening
3. **Error Visibility** - Errors shown immediately with context
4. **Better UX** - Reduces perceived wait time
5. **Debugging** - Progress history stored for troubleshooting

## Error Handling

- Callback errors don't interrupt processing
- Progress updates continue even if callback fails
- Errors are logged but don't stop agent execution
- All progress updates are stored in results

## Next Steps

To use this in your application:

1. **Set up WebSocket listener** on frontend for `agent.progress` events
2. **Create progress UI component** to show progress bar and status
3. **Integrate with capture flow** to show progress during task capture
4. **Handle errors gracefully** by showing error messages to users

See `docs/AGENTS_PROGRESS.md` for detailed documentation and examples.

