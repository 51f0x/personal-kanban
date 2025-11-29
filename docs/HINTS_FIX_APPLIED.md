# Fix Applied: Hints Now Always Created

## Problem Identified

Hints were not being created because:

1. **Root Cause**: When `TaskProcessorService.processTaskWithAgents()` was called with `updateTask: false`, it didn't call `applyResultsToTask()`, which is where hints are created.

2. **Location**: Hints are created in `AgentOrchestrator.applyResultsToTask()` at line 353 via `hintService.createHintsFromResults()`.

## Solution Applied

Modified `apps/worker/src/modules/agents/task-processor.service.ts` to **always create hints** regardless of the `updateTask` flag:

```typescript
// Always create hints from agent results (regardless of updateTask flag)
// This ensures users can review and apply suggestions individually
await this.hintService.createHintsFromResults(taskId, results);
this.logger.log(`Created hints for task ${taskId}`);

// Apply results to task if requested
if (options?.updateTask !== false) {
  await this.agentOrchestrator.applyResultsToTask(taskId, results, {...});
}
```

## Changes Made

1. ✅ Added `HintService` to `TaskProcessorService` constructor
2. ✅ Always call `hintService.createHintsFromResults()` after processing
3. ✅ Hints are now created even when `updateTask: false`

## Result

- **Hints are now ALWAYS created** when agents process tasks
- Users can review hints without auto-applying updates
- When `updateTask: true`, hints are created AND updates are applied
- When `updateTask: false`, hints are created but updates are NOT applied

## Testing

To verify hints are created:

1. Capture a task with a URL
2. Let agents process the task
3. Check the database for Hint records:
   ```sql
   SELECT * FROM "Hint" WHERE "taskId" = '<task-id>';
   ```
4. Or fetch the task via API - hints should be included in the response

## Next Steps

The API's `AgentCaptureService` still needs to be integrated with the worker's actual orchestrator (currently it just simulates). Once that's done, hints will be automatically created when tasks are captured with URLs.

