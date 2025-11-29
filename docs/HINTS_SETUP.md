# Setting Up Hints - Quick Start

## Prerequisites

Before using hints, you need to:

1. **Generate Prisma Client** (to update TypeScript types):
   ```bash
   npx prisma generate
   ```

2. **Create and Run Migration** (to add Hint table to database):
   ```bash
   npx prisma migrate dev --name add_hints
   ```

## What Was Implemented

### Backend

✅ Hint model added to Prisma schema
✅ Hints included in task queries automatically
✅ Hints management API endpoints created:
   - GET `/api/v1/tasks/:taskId/hints`
   - POST `/api/v1/hints/:id/apply`
   - PATCH `/api/v1/hints/:id/dismiss`
   - DELETE `/api/v1/hints/:id`

✅ Hint service that:
   - Creates hints from agent results
   - Applies hints to tasks
   - Handles tags creation/linking
   - Creates checklist items from actions

### Frontend

✅ HintsPanel component to display hints
✅ Integrated into TaskDetailModal
✅ API functions for hint management
✅ CSS styling for hints display
✅ Support for all hint types (tags, actions, summary, etc.)

## Usage

Once set up, hints will automatically appear in task detail modals. Users can:

- See all AI suggestions from agents
- Apply suggestions to update tasks
- Dismiss suggestions they don't want
- Delete hints permanently

Hints are automatically created when agents process tasks.

