# Hints UI Implementation Summary

## Overview

API endpoints have been updated to include hints when fetching tasks, and UI components have been created to display and manage hints. Users can now review, apply, or dismiss each AI suggestion individually.

## API Updates

### ✅ Already Implemented

The task service already includes hints in task queries:

```typescript
// In task.service.ts
getTaskById(id: string) {
  return this.prisma.task.findUnique({
    where: { id },
    include: {
      hints: {
        orderBy: [
          { applied: 'asc' },
          { confidence: 'desc' },
          { createdAt: 'desc' },
        ],
      },
    },
  });
}

listTasksForBoard(boardId: string) {
  return this.prisma.task.findMany({
    where: { boardId },
    include: {
      hints: {
        orderBy: [
          { applied: 'asc' },
          { confidence: 'desc' },
          { createdAt: 'desc' },
        ],
      },
    },
  });
}
```

### New Hints Management Endpoints

Created `apps/api/src/modules/tasks/hints.controller.ts` and `hints.service.ts`:

- **GET `/api/v1/tasks/:taskId/hints`** - Get all hints for a task
- **GET `/api/v1/hints/:id`** - Get a specific hint
- **POST `/api/v1/hints/:id/apply`** - Apply a hint (updates task with hint content)
- **PATCH `/api/v1/hints/:id/dismiss`** - Dismiss a hint (mark as applied without applying)
- **DELETE `/api/v1/hints/:id`** - Delete a hint

### Hint Application Logic

The hints service applies hints based on their type:

- **title** - Updates task title
- **description** - Appends to task description
- **context** - Sets task context
- **tags** - Finds or creates tags by name and links them to task
- **actions** - Creates checklist items from actions
- **summary** - Appends summary to description
- **priority** - Can be used to update metadata
- **duration** - Can be used to update metadata

## Frontend Implementation

### API Functions

Created `apps/web/src/api/hints.ts`:

- `fetchHints(taskId)` - Get hints for a task
- `applyHint(hintId, dismiss?)` - Apply or dismiss a hint
- `dismissHint(hintId)` - Dismiss a hint
- `deleteHint(hintId)` - Delete a hint

### Hints Panel Component

Created `apps/web/src/components/HintsPanel.tsx`:

- Displays all hints for a task
- Separates unapplied and applied hints
- Shows hint type, content, confidence, and agent source
- Provides Apply, Dismiss, and Delete actions
- Handles different hint content types (tags, actions, etc.)

### Task Detail Modal Integration

Updated `TaskDetailModal.tsx`:

- Imports and displays `HintsPanel` component
- Shows hints section when task has hints
- Refreshes task data after applying/dismissing hints

### Styling

Added comprehensive CSS styles in `app.css`:

- `.hints-panel` - Main panel container
- `.hint-card` - Individual hint cards
- `.hint-actions` - Action buttons
- Responsive design for mobile

## Hint Types Display

The UI handles different hint types:

- **Tags** - Displays as tag pills
- **Actions** - Shows as a bulleted list
- **Projects** - Displays as project pills
- **Content** (title, description, summary, etc.) - Shows as text
- **Structured data** - Rendered appropriately

## User Flow

1. User captures a task with a URL
2. Agents process the task and create hints
3. User opens task detail modal
4. Hints panel shows available suggestions
5. User can:
   - **Apply** a hint → Updates task with suggestion
   - **Dismiss** a hint → Marks as applied without applying
   - **Delete** a hint → Removes it permanently

## Files Created/Modified

### API

1. `apps/api/src/modules/tasks/hints.controller.ts` - NEW - Hints management endpoints
2. `apps/api/src/modules/tasks/hints.service.ts` - NEW - Hints business logic
3. `apps/api/src/modules/tasks/dto/apply-hint.input.ts` - NEW - DTO for applying hints
4. `apps/api/src/modules/tasks/task.module.ts` - Updated to include HintsController and HintsService

### Frontend

1. `apps/web/src/api/hints.ts` - NEW - API functions for hints
2. `apps/web/src/components/HintsPanel.tsx` - NEW - UI component for displaying hints
3. `apps/web/src/components/TaskDetailModal.tsx` - Updated to include HintsPanel
4. `apps/web/src/app.css` - Added hints panel styles

## Next Steps

1. **Generate Prisma Client**: Run `npx prisma generate` to update types
2. **Run Migration**: Execute `npx prisma migrate dev --name add_hints`
3. **Test the Flow**: Capture a task with a URL and verify hints appear
4. **Enhance UI**: Add animations, better error handling, loading states

## Features

✅ Hints automatically created from agent results
✅ Hints included in task queries
✅ Apply hints to update tasks
✅ Dismiss hints without applying
✅ Delete hints permanently
✅ Visual distinction between applied/unapplied hints
✅ Confidence scores displayed
✅ Agent source displayed
✅ Different hint types rendered appropriately

## Example

When a task has hints, the UI shows:

```
AI Suggestions

Available Suggestions (3)
┌─────────────────────────┐
│ 📝 Summary              │
│ 85% confidence          │
│                         │
│ [Summary content...]    │
│                         │
│ [Apply] [Dismiss] [X]  │
└─────────────────────────┘

┌─────────────────────────┐
│ 🏷️ Suggested Tags       │
│ 90% confidence          │
│                         │
│ [reading] [review]      │
│                         │
│ [Apply] [Dismiss] [X]  │
└─────────────────────────┘

Applied Suggestions (1)
┌─────────────────────────┐
│ ✓ Applied               │
│ 📌 Suggested Title      │
│ ...                     │
└─────────────────────────┘
```

