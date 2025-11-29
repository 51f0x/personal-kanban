# AI-Powered Agent Selection

## Overview

The `AgentOrchestrator` now uses AI to intelligently decide which agents should process each task, rather than always running all agents. This makes the system more efficient and focused.

## Agent Selector

A new `AgentSelectorAgent` analyzes task content and determines which agents are most relevant:

- **Web Content Agent** - Only if URL is present and content needs downloading
- **Summarization Agent** - Only if content is long (>500 chars) or needs condensing
- **Task Analysis Agent** - Usually always useful for metadata extraction
- **Context Extractor Agent** - Usually useful for categorization and tagging
- **Action Extractor Agent** - Only if task can be meaningfully broken down into steps

## Decision Process

1. **Initial Analysis**: 
   - Check for URL in task
   - Analyze task title and description
   - AI evaluates which agents would provide value

2. **Selection Criteria**:
   - **WebContent**: URL present AND content needs downloading
   - **Summarization**: Long content (>500 chars) OR needs condensing
   - **TaskAnalysis**: Usually always useful
   - **ContextExtraction**: Usually useful for categorization
   - **ActionExtraction**: Complex tasks that can be broken down

3. **Heuristics**:
   - Action extraction triggered by keywords like "complete", "implement", "build"
   - Multiple steps indicators (commas, "and", numbers)
   - Task complexity (length, multiple parts)

## Flow

```
Task Content
    ↓
Agent Selector (AI analyzes)
    ↓
Agent Selection Result
    ↓
Only Selected Agents Run
    ↓
Hints Created from Results
```

## Benefits

✅ **Efficient**: Only runs relevant agents
✅ **Faster**: Skips unnecessary processing
✅ **Focused**: Agents run only when they add value
✅ **AI-Driven**: Intelligent decisions based on content

## Example Selections

### Simple Task
```
Task: "Call John"
Selection: 
- TaskAnalysis: ✅ (extract metadata)
- ContextExtraction: ✅ (categorize)
- ActionExtraction: ❌ (too simple)
- WebContent: ❌ (no URL)
- Summarization: ❌ (no content)
```

### Task with URL
```
Task: "Read article https://example.com/article"
Selection:
- WebContent: ✅ (URL present)
- Summarization: ✅ (if content is long)
- TaskAnalysis: ✅
- ContextExtraction: ✅
- ActionExtraction: ❌ (simple read task)
```

### Complex Task
```
Task: "Build login system with OAuth and email verification"
Selection:
- TaskAnalysis: ✅
- ContextExtraction: ✅
- ActionExtraction: ✅ (complex, needs breakdown)
- WebContent: ❌ (no URL)
- Summarization: ❌ (no content)
```

## Configuration

Agent selection can be overridden via options:
- `skipWebContent`: Force skip web content agent
- `skipSummarization`: Force skip summarization

But AI still decides on other agents.

## Files

- `apps/worker/src/modules/agents/agent-selector.agent.ts` - NEW - AI agent selector
- `apps/worker/src/modules/agents/agent-orchestrator.service.ts` - Updated to use selector

