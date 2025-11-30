# To-Markdown Agent

## Overview

The `ToMarkdownAgent` formats task descriptions into well-structured markdown. It runs as the **last action** after all other agents have processed the task, ensuring the final description is properly formatted.

## Purpose

Task descriptions can come from various sources (captured text, agent suggestions, summaries) and may not be well-formatted. This agent:

- Formats plain text into proper markdown
- Improves readability and structure
- Preserves all original content
- Uses markdown syntax for better presentation

## When It Runs

- **Last Step**: After all other agents (web content, summarization, analysis, context, actions)
- **Only if**: Task has a description to format
- **Always**: Runs for every task with a description

## Formatting Rules

The agent applies markdown formatting:

- **Headers** (##, ###) for major sections
- **Lists** (-, *) for items
- **Bold** (**text**) for emphasis
- **Code blocks** (```) for code or commands
- **Links** [text](url) for URLs
- **Structure** improves organization while preserving content

## Integration

### Flow

```
All Other Agents → Enhanced Description → ToMarkdownAgent → Formatted Markdown
```

### In Orchestrator

1. All analysis agents run (Task Analysis, Context, Actions)
2. Description is enhanced with summaries and suggestions
3. **ToMarkdownAgent runs last** (Step 5)
4. Formatted markdown description created
5. Hint created with formatted description
6. If confidence >= 80%, hint auto-applied

### Hint Creation

Creates a hint with:
- **Type**: `description`
- **Content**: Formatted markdown description
- **Confidence**: Formatting confidence score
- **Auto-Applied**: If confidence >= 80%

### Task Update

When updating task:
- **Priority**: Formatted markdown > Suggested description > Summary
- If markdown format available, it replaces the description
- Ensures task always has well-formatted description

## Example

### Before
```
Read the article about AI and machine learning. Make notes. Discuss with team.
```

### After
```
## Task: Read AI Article

### Actions
- Read the article about AI and machine learning
- Make notes
- Discuss with team
```

## Files

- `apps/worker/src/modules/agents/to-markdown.agent.ts` - NEW
- `apps/worker/src/modules/agents/agent-orchestrator.service.ts` - Integrated as last step
- `apps/worker/src/modules/agents/hint.service.ts` - Creates hints from results
- `apps/worker/src/modules/agents/types.ts` - Added MarkdownFormatResult

## Status

✅ **COMPLETE** - Markdown formatting runs as the last action after all agents!

