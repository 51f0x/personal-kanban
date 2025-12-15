# Testing Worker Agents

This document describes how to test the worker agents without the overhead of the API and UI.

## Quick Start

### Option 1: Direct Testing (No Queue)

Run the test script directly:

```bash
cd apps/worker
pnpm test:agents
```

### Option 2: Send Task to Queue

Send a task to the BullMQ queue for processing:

```bash
cd apps/worker
export TEST_TASK_ID=<your-task-uuid>
pnpm queue:send
```

## Configuration

The test script will prompt you for task details interactively, or you can use environment variables:

### Interactive Mode (Default)

Simply run the script and it will prompt you:

```bash
cd apps/worker
pnpm test:agents
```

You'll be asked for:
- Task title (required)
- Task description (optional)
- Task URL (optional)

### Using Environment Variables

You can also pre-configure the task using environment variables:

```bash
# LLM Configuration (required)
export LLM_ENDPOINT=http://localhost:11434
export LLM_MODEL=granite4:1b

# Optional: Customize test task
export TEST_TASK_ID=<uuid>  # Must be valid UUID
export TEST_TASK_TITLE="Review this article"
export TEST_TASK_DESCRIPTION="Read and provide feedback on the article"
export TEST_TASK_URL=https://example.com/article
```

## Example Usage

### Interactive Test (Recommended)

Run the script and enter task details when prompted:

```bash
cd apps/worker
pnpm test:agents

# You'll be prompted:
# Enter task title: Review this article
# Enter task description (optional, press Enter to skip): Read and provide feedback
# Enter task URL (optional, press Enter to skip): https://example.com/article
```

### Test with Environment Variables

Pre-configure the task using environment variables:

```bash
export TEST_TASK_TITLE="Implement user authentication"
export TEST_TASK_DESCRIPTION="Add login and registration functionality with JWT tokens"
export TEST_TASK_URL=https://docs.example.com/auth-guide
pnpm test:agents
```

### Test with Different LLM Model

```bash
export LLM_MODEL=llama3:8b
export LLM_ENDPOINT=http://localhost:11434
pnpm test:agents
```

## What the Script Does

1. **Initializes all agents** - Creates instances of all worker agents
2. **Connects to Ollama** - Verifies LLM connection and available models
3. **Creates a mock task** - Uses environment variables or defaults
4. **Runs Agent Orchestrator** - Processes the task through all selected agents
5. **Prints results** - Displays all agent outputs to the console

## Output

The script prints:
- Configuration information
- Connection status
- Real-time progress updates
- Results from each agent:
  - Web Content Agent (if URL present)
  - Content Summarizer Agent
  - Task Analyzer Agent
  - Context Extractor Agent
  - Action Extractor Agent
  - Task Assistant Agent
- Full JSON result at the end

## Sending Tasks to Queue

To send a task to the BullMQ queue instead of processing directly:

```bash
# Required: Task ID (must be a valid UUID)
export TEST_TASK_ID=123e4567-e89b-12d3-a456-426614174000

# Optional: Board ID (must be a valid UUID)
export TEST_BOARD_ID=123e4567-e89b-12d3-a456-426614174001

# Optional: Redis URL
export REDIS_URL=redis://localhost:6379

# Send to queue
pnpm queue:send
```

The worker service will automatically pick up and process the job from the queue.

## Requirements

- Ollama must be running and accessible
- The specified LLM model must be available (or will be pulled automatically)
- Node.js and pnpm installed
- For queue testing: Redis must be running and accessible

## Troubleshooting

### "Failed to connect to Ollama"

Make sure Ollama is running:
```bash
ollama serve
```

### "Model not found"

The model will be automatically pulled on first use, but you can pull it manually:
```bash
ollama pull granite4:1b
```

### Script exits with errors

Check that all dependencies are installed:
```bash
pnpm install
```
