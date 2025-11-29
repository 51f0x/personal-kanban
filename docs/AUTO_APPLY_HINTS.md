# Auto-Apply High-Confidence Hints

## Overview

Hints with confidence >= 80% are now automatically applied to tasks when they're created. This reduces manual work while maintaining transparency.

## How It Works

1. **Hints Created**: Agents process tasks and create hints with confidence scores
2. **Auto-Apply Check**: After creation, hints with confidence >= 0.8 (80%) are identified
3. **Auto-Apply**: High-confidence hints are automatically applied to the task
4. **Marked as Applied**: Applied hints are marked with `applied: true`

## Confidence Threshold

- **Threshold**: >= 80% (0.8)
- **Rationale**: High confidence indicates AI is very certain about the suggestion
- **Balance**: Auto-applies clear suggestions, keeps uncertain ones for review

## Auto-Applied Hint Types

The following hint types can be auto-applied:

✅ **Title** - Suggested title updates
✅ **Description** - Suggested description (appended or replaced)
✅ **Context** - Suggested context (EMAIL, MEETING, etc.)
✅ **Tags** - Suggested tags (found or created, then linked)
✅ **Actions** - Suggested checklist items
✅ **Summary** - Content summaries (appended to description)

Not Auto-Applied (informational):
- **Web Content** - Informational only
- **Project Hints** - Informational only
- **Priority** - Needs schema support
- **Duration** - Needs schema support

## Example

### Before Auto-Apply
```
Task: "Read article about AI"
Hints created:
- Title: "Read: AI Article" (confidence: 95%) → Manual review
- Tags: ["ai", "reading"] (confidence: 85%) → Manual review
- Context: "READ" (confidence: 90%) → Manual review
```

### After Auto-Apply
```
Task: "Read article about AI"
Hints created:
- Title: "Read: AI Article" (confidence: 95%) → ✅ AUTO-APPLIED
- Tags: ["ai", "reading"] (confidence: 85%) → ✅ AUTO-APPLIED
- Context: "READ" (confidence: 90%) → ✅ AUTO-APPLIED
- Priority: "medium" (confidence: 65%) → Manual review (below threshold)
```

## Implementation

### Location
`apps/worker/src/modules/agents/hint.service.ts`

### Key Methods

1. **`createHintsFromResults()`** - Creates hints, then calls auto-apply
2. **`autoApplyHighConfidenceHints()`** - Filters and applies high-confidence hints
3. **`applyHintToTask()`** - Applies individual hint to task

### Flow

```
Agent Results
    ↓
Create Hints (with confidence scores)
    ↓
Filter: confidence >= 80%
    ↓
Auto-Apply Each High-Confidence Hint
    ├─ Update task fields
    ├─ Create/find tags
    ├─ Create checklist items
    └─ Mark hint as applied
```

## Logging

Auto-application is logged:
```
Auto-applying 3 high-confidence hints (>=80%) for task abc-123: 
title (95%), tags (85%), context (90%)
```

Individual hint application:
```
Auto-applied hint xyz-456 (confidence: 0.95, type: title)
```

## Benefits

✅ **Less Manual Work**: High-confidence suggestions applied automatically
✅ **Transparency**: All hints still visible, applied ones marked clearly
✅ **Quality Control**: Only very certain suggestions are auto-applied
✅ **User Control**: Low-confidence hints still require manual review

## User Experience

- **Applied Hints**: Marked as applied, visible in hints panel (grayed out)
- **Unapplied Hints**: Require manual review and application
- **Task Updated**: Task fields automatically updated with high-confidence suggestions

## Configuration

The confidence threshold (80%) is hardcoded in:
```typescript
confidence >= 0.8
```

To change, modify the filter in `autoApplyHighConfidenceHints()`.

