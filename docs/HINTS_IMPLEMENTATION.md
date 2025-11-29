# Hints Implementation Summary

## Overview

Agent results are now stored as "hints" attached to tasks using a one-to-many relationship. This allows users to review and apply individual suggestions from agents rather than having all results automatically applied or stored only in metadata.

## Changes Made

### 1. Database Schema

Added `Hint` model to Prisma schema:

```prisma
model Hint {
  id          String   @id @default(uuid())
  taskId      String   @db.Uuid
  agentId     String   // Which agent created this hint
  hintType    String   // Type of hint (title, tags, summary, etc.)
  title       String?  // Optional label
  content     String?  // Main content
  data        Json?    // Structured data
  confidence  Float?   // Confidence score
  applied     Boolean  @default(false) // User applied this hint
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  task        Task     @relation(...)
}
```

Added relationship to Task:
```prisma
model Task {
  // ... existing fields
  hints       Hint[]
}
```

### 2. Hint Service

Created `apps/worker/src/modules/agents/hint.service.ts`:

- `createHintsFromResults()` - Creates hints from all agent results
- `getHintsForTask()` - Retrieves hints for a task (sorted by applied, confidence, date)
- `applyHint()` - Marks a hint as applied
- `deleteHint()` - Removes a hint

### 3. Agent Orchestrator Integration

Updated `AgentOrchestrator.applyResultsToTask()`:

- Creates hints **first** before applying any updates
- Hints are created from all agent results automatically
- Users can then review and apply hints individually

### 4. Hint Types Created

Each agent creates specific hints:

| Agent | Hint Types |
|-------|-----------|
| Web Content Agent | `web-content` |
| Content Summarizer Agent | `summary` |
| Task Analyzer Agent | `title`, `description`, `context`, `tags`, `priority`, `duration` |
| Context Extractor Agent | `context`, `tags`, `project-hints` |
| Action Extractor Agent | `actions` |

## Migration Required

You need to create and run a migration:

```bash
# Generate migration
npx prisma migrate dev --name add_hints

# Or apply existing migration
npx prisma migrate deploy
```

## Usage Example

### Agent Processing Flow

1. Task is captured with URL
2. Agents process the task
3. **Hints are created automatically** for each agent result
4. Task metadata stores minimal info (processing time, hint count)
5. Users see hints in UI and can apply/dismiss them

### Code Flow

```typescript
// 1. Process task with agents
const results = await agentOrchestrator.processTask(taskId);

// 2. Apply results (creates hints automatically)
await agentOrchestrator.applyResultsToTask(taskId, results, {
  updateTitle: false, // Don't auto-apply - let user review hints
  updateTags: false,
});

// 3. Get hints for user to review
const hints = await hintService.getHintsForTask(taskId);
// Returns: [unapplied hints first, sorted by confidence]

// 4. User applies a hint
await hintService.applyHint(hintId);
```

## Benefits

1. **User Control** - Review each suggestion before applying
2. **No Data Loss** - All agent results preserved as hints
3. **Confidence Scores** - See how confident each suggestion is
4. **Transparency** - All suggestions visible, not hidden in metadata
5. **History** - Track which hints were applied/dismissed

## Next Steps

1. **Run Migration** - Add Hint table to database
2. **Update Task Queries** - Include hints when fetching tasks
3. **Create UI Components** - Show hints in task detail view
4. **Add API Endpoints** - For applying/dismissing hints

## Files Modified

- `prisma/schema.prisma` - Added Hint model and Task relationship
- `apps/worker/src/modules/agents/hint.service.ts` - NEW - Hint management service
- `apps/worker/src/modules/agents/agents.module.ts` - Added HintService
- `apps/worker/src/modules/agents/agent-orchestrator.service.ts` - Creates hints from results

## Future Enhancements

- Batch apply hints
- Hint templates/presets
- Hint confidence thresholds
- Hint expiration
- Hint suggestions based on applied hints

