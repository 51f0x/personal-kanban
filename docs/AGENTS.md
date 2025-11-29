# Multi-Agent System for Task Processing

This document describes the multi-agent system that helps users work on tasks more efficiently by automatically downloading and summarizing web content, analyzing tasks, and extracting actionable items.

## Overview

The system uses multiple specialized agents that work together to process tasks:

1. **Web Content Agent** - Downloads and extracts content from URLs
2. **Content Summarizer Agent** - Summarizes downloaded content
3. **Task Analyzer Agent** - Analyzes tasks and extracts metadata
4. **Context Extractor Agent** - Extracts context, tags, and project hints
5. **Action Extractor Agent** - Extracts actionable items from content

## Agent Architecture

### Web Content Agent (`web-content-agent`)

**Purpose**: Downloads and extracts content from URLs found in tasks.

**Features**:
- Automatically detects URLs in task text or metadata
- Downloads HTML/text content from web pages
- Extracts plain text from HTML (removes scripts, styles, tags)
- Extracts page titles and main content
- Handles timeouts and errors gracefully

**Output**: 
- Downloaded content (text and HTML)
- Page title
- Content type information
- Download metadata

### Content Summarizer Agent (`content-summarizer-agent`)

**Purpose**: Summarizes downloaded web content to make it easier to work with.

**Features**:
- Uses LLM to create concise summaries
- Extracts key points from content
- Works only on actual downloaded content (no invention)
- Configurable summary length

**Output**:
- Summary text (~500 words by default)
- Key points (3-5 bullet points)
- Word count and compression ratio

### Task Analyzer Agent (`task-analyzer-agent`)

**Purpose**: Analyzes tasks and extracts metadata using LLM.

**Features**:
- Works with original task text and summarized content
- Extracts suggested title and description
- Identifies context (EMAIL, MEETING, PHONE, READ, WATCH, DESK, etc.)
- Suggests tags, priority, due dates
- Estimates duration
- Only uses provided data (no invention)

**Output**:
- Suggested title and description
- Context
- Suggested tags
- Priority level
- Estimated duration
- Due date hints

### Context Extractor Agent (`context-extractor-agent`)

**Purpose**: Specialized extraction of context, tags, and project hints.

**Features**:
- Focused on context identification
- Extracts relevant tags
- Suggests project associations
- Estimates task duration

**Output**:
- Context (EMAIL, MEETING, etc.)
- Tags array
- Project hints
- Duration estimate

### Action Extractor Agent (`action-extractor-agent`)

**Purpose**: Extracts actionable items from content to help break down complex tasks.

**Features**:
- Breaks down tasks into specific actions
- Assigns priorities to actions
- Estimates duration for each action
- Creates checklist items automatically

**Output**:
- Array of actionable items
- Each with description, priority, and duration
- Total action count

## Agent Orchestrator

The `AgentOrchestrator` coordinates all agents to process a task:

1. **Detects URLs** in task text/metadata
2. **Downloads content** if URL is present
3. **Summarizes content** if download was successful
4. **Runs all analysis agents in parallel**:
   - Task Analyzer
   - Context Extractor
   - Action Extractor
5. **Combines results** from all agents
6. **Applies results to task** (optional):
   - Updates title/description
   - Sets context
   - Adds tags
   - Creates checklist from actions

## Usage

### Processing a Task with Agents

The agents run in the worker service. To process a task:

**From Worker Service**:
```typescript
import { TaskProcessorService } from './modules/agents/task-processor.service';

// Process task with all agents
await taskProcessorService.processTaskWithAgents(taskId, {
  updateTask: true,              // Apply results to task
  skipWebContent: false,         // Download web content
  skipSummarization: false,      // Summarize content
});
```

**Direct Orchestrator Access**:
```typescript
import { AgentOrchestrator } from './modules/agents/agent-orchestrator.service';

// Process task
const results = await agentOrchestrator.processTask(taskId);

// Apply results
await agentOrchestrator.applyResultsToTask(taskId, results, {
  updateTitle: true,
  updateDescription: true,
  updateContext: true,
  updateTags: true,
  addChecklistFromActions: true,
});
```

### Automatic Processing

To automatically process tasks when created (e.g., via BullMQ):

1. Set up a BullMQ job processor that listens for task creation events
2. Call `TaskProcessorService.processTaskWithAgents()` when a task is created
3. Configure which agents to run and whether to auto-apply results

### API Endpoint

Check agent processing status:
```
GET /api/v1/agents/tasks/:taskId
```

Returns:
- Whether task has URLs
- Agent processing history
- Available agents

## Configuration

Agents use the same LLM configuration as the main system:

```env
LLM_ENDPOINT=http://localhost:11434
LLM_MODEL=granite4:1b
```

## Important Principles

1. **No Invention**: Agents only work on actual data from:
   - Task text
   - Downloaded web content
   - User-provided metadata
   
2. **Graceful Degradation**: If one agent fails, others continue processing

3. **Transparency**: All agent processing is logged and stored in task metadata

4. **User Control**: Users can see what agents suggested and accept/reject changes

## Example Flow

1. User creates task: "Review this article: https://example.com/article"
2. Web Content Agent downloads the article
3. Content Summarizer Agent creates a summary
4. Task Analyzer Agent suggests:
   - Title: "Review: Article Title"
   - Context: READ
   - Tags: ["reading", "review"]
5. Action Extractor Agent creates checklist:
   - [ ] Read the article summary
   - [ ] Take notes on key points
   - [ ] Write review feedback
6. Results are applied to the task automatically

## Future Enhancements

- BullMQ job queue integration for automatic processing
- Agent result caching
- Custom agent configurations per board/user
- Agent processing rules (when to run which agents)
- Integration with clarification wizard

