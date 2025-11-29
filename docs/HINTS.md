# Task Hints System

Agent results are now stored as "hints" attached to tasks, allowing users to review and apply suggestions individually.

## Data Model

### Hint Model

```prisma
model Hint {
  id          String   @id @default(uuid())
  taskId      String   @db.Uuid
  agentId     String   // e.g., "web-content-agent", "task-analyzer-agent"
  hintType    String   // e.g., "title", "description", "context", "tags", "summary", "actions"
  title       String?  // Optional title/label for the hint
  content     String?  // Main content of the hint
  data        Json?    // Structured data (e.g., tags array, actions array)
  confidence  Float?   // Confidence score 0-1
  applied     Boolean  @default(false) // Whether user has applied this hint
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  task        Task     @relation(...)
}
```

### Relationship

- **Task has many Hints** (one-to-many)
- Hints are automatically created when agents process tasks
- Users can review, apply, or dismiss hints

## Hint Types

Hints are categorized by type:

- `web-content` - Downloaded web content information
- `summary` - Content summary from summarizer agent
- `title` - Suggested title
- `description` - Suggested description
- `context` - Suggested context (EMAIL, MEETING, etc.)
- `tags` - Suggested tags
- `priority` - Suggested priority level
- `duration` - Estimated duration
- `project-hints` - Suggested project associations
- `actions` - Suggested actionable items

## Agent Results → Hints

Each agent result creates specific hints:

### Web Content Agent
- Creates `web-content` hint with URL, title, content type

### Content Summarizer Agent
- Creates `summary` hint with summary text and key points

### Task Analyzer Agent
- Creates multiple hints:
  - `title` - Suggested title
  - `description` - Suggested description
  - `context` - Suggested context
  - `tags` - Suggested tags array
  - `priority` - Priority level
  - `duration` - Estimated duration

### Context Extractor Agent
- Creates hints:
  - `context` - Suggested context
  - `tags` - Suggested tags
  - `project-hints` - Suggested projects

### Action Extractor Agent
- Creates `actions` hint with array of actionable items

## Usage

### Creating Hints

Hints are automatically created when agents process tasks:

```typescript
// In AgentOrchestrator.applyResultsToTask()
await this.hintService.createHintsFromResults(taskId, results);
```

### Getting Hints for a Task

```typescript
const hints = await hintService.getHintsForTask(taskId);
// Returns hints sorted by: unapplied first, then by confidence (high to low), then by date (newest first)
```

### Applying a Hint

```typescript
await hintService.applyHint(hintId);
// Marks the hint as applied
```

### Deleting a Hint

```typescript
await hintService.deleteHint(hintId);
// Removes the hint
```

## Benefits

1. **Granular Control** - Users can review and apply individual suggestions
2. **Transparency** - All agent suggestions are visible
3. **No Data Loss** - All agent results are preserved even if not applied
4. **Confidence Scores** - Users can see how confident each hint is
5. **History** - Applied/unapplied hints provide a history of suggestions

## Example

When processing a task with a URL:

1. Web Content Agent downloads content → creates `web-content` hint
2. Summarizer Agent creates summary → creates `summary` hint
3. Task Analyzer suggests title → creates `title` hint
4. Task Analyzer suggests tags → creates `tags` hint
5. Action Extractor finds actions → creates `actions` hint

User can then:
- Review all hints in the UI
- Apply the title hint (updates task title)
- Apply tags hint (adds tags to task)
- Apply actions hint (creates checklist items)
- Dismiss hints they don't want

## Migration

To add hints to your database:

```bash
# Generate migration
npx prisma migrate dev --name add_hints

# Apply migration
npx prisma migrate deploy
```

## API Integration

Tasks will now include hints when fetched:

```typescript
const task = await prisma.task.findUnique({
  where: { id: taskId },
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
```

