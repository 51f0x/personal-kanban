# Worker Service Flow Documentation

This document describes the complete flow of the worker service, including job processing, agent orchestration, and background workers.

## Overview

The worker service is a NestJS application that runs as a background service to process tasks asynchronously. It handles:

1. **Agent Processing** - Multi-agent task processing via BullMQ jobs
2. **Email Reminders** - Scheduled email notifications for prioritized tasks
3. **IMAP Integration** - Email capture from IMAP mailboxes
4. **Inter-Container Communication** - Queue-based communication with API service
5. **Event Publishing** - Domain event publishing via Redis event bus

## Architecture

### Entry Point

**File**: `apps/worker/src/main.ts`

The application starts as a NestJS application context (not an HTTP server):

```typescript
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  // ... shutdown handlers
}
```

### Module Structure

**File**: `apps/worker/src/modules/worker.module.ts`

The `WorkerModule` imports all sub-modules:

- **ConfigModule** - Configuration management
- **EventsModule** - Global event bus (Redis-based)
- **InterContainerModule** - Inter-container queue communication
- **DatabaseModule** - Prisma database access
- **CaptureWorkerModule** - Quick task creation from captures
- **IntegrationsModule** - IMAP email polling
- **AgentsModule** - Multi-agent task processing
- **NotificationsModule** - Email reminders and notifications

## Main Flows

### 1. Agent Processing Flow

The primary flow for processing tasks with AI agents.

#### Job Queue Setup

**File**: `apps/worker/src/modules/agents/agents.module.ts`

Two BullMQ queues are configured:

1. **`agent-processing`** - Jobs for processing tasks with agents
   - Retries: 3 attempts with exponential backoff
   - Job retention: 1 hour for completed, 24 hours for failed

2. **`agent-results`** - Jobs for sending results back to API
   - Retries: 1 attempt (idempotent)
   - Job retention: 1 hour for completed, 24 hours for failed

#### Job Processing

**File**: `apps/worker/src/modules/agents/processors/agent-job.processor.ts`

The `AgentJobProcessor` listens to the `agent-processing` queue:

```typescript
@Processor("agent-processing")
export class AgentJobProcessor extends WorkerHost {
  async process(job: Job<AgentProcessingJobData>): Promise<void> {
    const { taskId, boardId } = job.data;
    
    // Process task with agents
    const results = await this.taskProcessorService.processTaskWithAgents(
      taskId,
      { updateTask: true }
    );
    
    // Send results back to API
    if (results) {
      await this.resultSenderService.sendResult(taskId, boardId, results);
    }
  }
}
```

#### Task Processing Pipeline

**File**: `apps/worker/src/modules/agents/services/task-processor.service.ts`

The `TaskProcessorService` orchestrates the complete processing:

1. **Agent Orchestration** - Runs all selected agents
2. **Result Application** - Applies results to task (updates, hints, checklist)
3. **Markdown Conversion** - Converts description to markdown format

```typescript
async processTaskWithAgents(taskId: string, options?: {...}): Promise<AgentProcessingResult> {
  // 1. Process with agents
  const results = await this.agentOrchestrator.processTask(taskId, {...});
  
  // 2. Apply results to task
  if (options?.updateTask !== false) {
    await this.agentApplicationService.applyResultsToTask(taskId, results, {...});
  }
  
  // 3. Convert to markdown
  await this.convertDescriptionToMarkdown(taskId, options?.onProgress);
  
  return results;
}
```

#### Agent Orchestration

**File**: `apps/worker/src/modules/agents/services/agent-orchestrator.service.ts`

The `AgentOrchestrator` coordinates multiple specialized agents:

**Step 1: Agent Selection**
- Uses `AgentSelectorAgent` to intelligently select which agents to run
- Considers task content, URLs, and content length
- Only runs relevant agents to optimize performance

**Step 2: Web Content Download** (if selected)
- `WebContentAgent` detects URLs in task
- Downloads and extracts content from web pages
- Publishes progress events

**Step 3: Content Summarization** (if selected)
- `ContentSummarizerAgent` summarizes downloaded content
- Only runs if content is substantial (>500 chars)
- Creates concise summaries with key points

**Step 4: Task Assistant Workflow** (Primary)
- `TaskAssistantAgent` implements complete workflow:
  - **Clarification**: Identifies questions needed to complete task
  - **Structure**: Defines goal, requirements, constraints, format
  - **Implementation**: Completes task with usable result
  - **Quality Assurance**: Reviews and optimizes result

**Step 5: Action Extraction** (if selected)
- `ActionExtractorAgent` extracts actionable items
- Creates checklist items from actions
- Guides other agents with extracted actions

**Step 6: Solution Proposal** (if meaningful content)
- `SolutionProposerAgent` proposes sophisticated solutions
- Only runs if there are meaningful actions or substantial content
- Provides advanced solution approaches

**Step 7: Task Help Generation** (if substantial content)
- `TaskHelpAgent` generates comprehensive guidance
- Only runs if content is substantial (>100 chars)
- Provides sophisticated help from web content

**Step 8: Parallel Analysis Agents**
- `TaskAnalyzerAgent` - Analyzes task and extracts metadata
- `ContextExtractorAgent` - Extracts context, tags, and categories
- Both run in parallel if selected

**Progress Events**: Throughout processing, progress events are published via the event bus:
- `AgentProgressEvent` - Real-time progress updates
- `AgentCompletedEvent` - Completion notification

#### Result Application

**File**: `apps/worker/src/modules/agents/services/agent-application.service.ts`

The `AgentApplicationService` applies agent results to tasks:

1. **Create Hints** - Creates hint records from all agent results
2. **Update Task** - Updates title, description, context, tags
3. **Add Checklist** - Creates checklist items from extracted actions
4. **Store Metadata** - Stores processing metadata in task

```typescript
async applyResultsToTask(taskId: string, results: AgentProcessingResult, options?: {...}): Promise<void> {
  // 1. Create hints from results
  await this.hintService.createHintsFromResults(taskId, results);
  
  // 2. Update task fields
  await this.prisma.task.update({
    where: { id: taskId },
    data: {
      title: results.taskAnalysis?.suggestedTitle,
      description: enhancedDescription,
      context: results.taskAnalysis?.context,
      // ... other updates
    }
  });
  
  // 3. Add checklist items
  if (results.actionExtraction?.actions) {
    await this.prisma.checklistItem.createMany({...});
  }
}
```

#### Result Sending

**File**: `apps/worker/src/modules/agents/services/agent-result-sender.service.ts`

After processing, results are sent back to the API via the `agent-results` queue:

```typescript
async sendResult(taskId: string, boardId: string, results: AgentProcessingResult): Promise<void> {
  await this.resultQueue.add("process-result", {
    taskId,
    boardId,
    results: {
      taskAnalysis: {...},
      contextExtraction: {...},
      actionExtraction: {...},
      errors: results.errors,
    },
    processingTimeMs: results.processingTimeMs,
  });
}
```

### 2. Email Reminder Flow

**File**: `apps/worker/src/modules/notifications/email-reminder.worker.ts`

The `EmailReminderWorker` runs on a scheduled interval:

1. **Startup** - Runs immediately on module init, then on configured interval
2. **User Retrieval** - Gets all users with email addresses via inter-container queue
3. **Task Prioritization** - Gets prioritized tasks for each user
4. **Email Generation** - Creates work package emails with task details
5. **Email Sending** - Sends emails via `EmailService`
6. **Task Movement** - Moves tasks to "Next Actions" column after successful send

**Configuration**:
- `EMAIL_REMINDERS_ENABLED` - Enable/disable reminders
- `EMAIL_REMINDER_INTERVAL_HOURS` - Interval between reminder runs (default: 24)
- `EMAIL_MAX_TASKS_PER_EMAIL` - Maximum tasks per email (default: 10)

### 3. IMAP Integration Flow

**File**: `apps/worker/src/modules/integrations/imap.poller.ts`

The `ImapPollerService` polls IMAP mailboxes for new emails:

1. **Connection** - Connects to IMAP server on module init
2. **Polling** - Polls mailbox at configured interval
3. **Email Processing** - For each unseen email:
   - Extracts subject, from, and content
   - Creates task via `QuickTaskService`
   - Marks email as seen

**Configuration**:
- `IMAP_HOST` - IMAP server host
- `IMAP_USERNAME` - IMAP username
- `IMAP_PASSWORD` - IMAP password
- `IMAP_PORT` - IMAP port (default: 993)
- `IMAP_SECURE` - Use SSL/TLS (default: true)
- `IMAP_MAILBOX` - Mailbox to poll (default: INBOX)
- `IMAP_POLL_INTERVAL_MS` - Poll interval in milliseconds (default: 60000)
- `IMAP_DEFAULT_BOARD_ID` - Board ID for created tasks
- `IMAP_DEFAULT_OWNER_ID` - Owner ID for created tasks
- `IMAP_DEFAULT_COLUMN_ID` - Optional column ID for created tasks

### 4. Inter-Container Communication

**File**: `apps/worker/src/modules/inter-container/inter-container-queue.service.ts`

The `InterContainerQueueService` enables communication between worker and API:

**Queues**:
- `api-requests` - Worker → API requests
- `api-responses` - API → Worker responses

**Usage**:
- Worker sends requests to API (e.g., get users, get columns, move tasks)
- Worker receives responses via worker listening to `api-responses` queue
- Request/response pattern with timeout handling

### 5. Event Publishing

**File**: `apps/worker/src/modules/events/redis-event-bus.service.ts`

The `EventsModule` provides a global event bus:

- **Redis-based** - Uses Redis pub/sub for event distribution
- **Domain Events** - Publishes domain events (e.g., `AgentProgressEvent`, `AgentCompletedEvent`)
- **Real-time Updates** - Enables real-time progress updates to API and clients

## Data Flow Diagram

```
┌─────────────────┐
│   API Service   │
│                 │
│  Creates Task   │
│  Adds Job to    │
│  agent-processing│
└────────┬────────┘
         │
         │ BullMQ Queue
         ▼
┌─────────────────────────────────────┐
│     AgentJobProcessor               │
│  (Listens to agent-processing)      │
└────────┬────────────────────────────┘
         │
         │ processTaskWithAgents()
         ▼
┌─────────────────────────────────────┐
│   TaskProcessorService              │
│                                     │
│  1. Agent Orchestration             │
│  2. Result Application               │
│  3. Markdown Conversion              │
└────────┬────────────────────────────┘
         │
         │ processTask()
         ▼
┌─────────────────────────────────────┐
│   AgentOrchestrator                 │
│                                     │
│  1. Agent Selection                │
│  2. Web Content Download            │
│  3. Content Summarization           │
│  4. Task Assistant                  │
│  5. Action Extraction               │
│  6. Solution Proposal               │
│  7. Task Help                       │
│  8. Parallel Analysis               │
└────────┬────────────────────────────┘
         │
         │ Results
         ▼
┌─────────────────────────────────────┐
│   AgentApplicationService           │
│                                     │
│  1. Create Hints                    │
│  2. Update Task                     │
│  3. Add Checklist                   │
└────────┬────────────────────────────┘
         │
         │ Results
         ▼
┌─────────────────────────────────────┐
│   AgentResultSenderService          │
│                                     │
│  Sends to agent-results queue       │
└────────┬────────────────────────────┘
         │
         │ BullMQ Queue
         ▼
┌─────────────────┐
│   API Service   │
│                 │
│  Receives       │
│  Results        │
└─────────────────┘
```

## Event Flow

```
AgentOrchestrator
    │
    │ Publishes events
    ▼
Redis Event Bus
    │
    ├─► API Service (WebSocket)
    │   └─► Client (Real-time updates)
    │
    └─► Other Services
```

## Configuration

### Environment Variables

**Redis**:
- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379`)

**API Communication**:
- `API_URL` - API service URL (default: `http://localhost:3000`)
- `INTERNAL_SERVICE_TOKEN` - Internal service authentication token

**Email Reminders**:
- `EMAIL_REMINDERS_ENABLED` - Enable email reminders (default: `true`)
- `EMAIL_REMINDER_INTERVAL_HOURS` - Reminder interval (default: `24`)
- `EMAIL_MAX_TASKS_PER_EMAIL` - Max tasks per email (default: `10`)
- `WEB_URL` - Web application URL for task links

**IMAP Integration**:
- `IMAP_HOST` - IMAP server host
- `IMAP_USERNAME` - IMAP username
- `IMAP_PASSWORD` - IMAP password
- `IMAP_PORT` - IMAP port (default: `993`)
- `IMAP_SECURE` - Use SSL/TLS (default: `true`)
- `IMAP_MAILBOX` - Mailbox to poll (default: `INBOX`)
- `IMAP_POLL_INTERVAL_MS` - Poll interval (default: `60000`)
- `IMAP_DEFAULT_BOARD_ID` - Default board for tasks
- `IMAP_DEFAULT_OWNER_ID` - Default owner for tasks
- `IMAP_DEFAULT_COLUMN_ID` - Optional default column

**LLM** (for agents):
- `LLM_ENDPOINT` - LLM endpoint (default: `http://localhost:11434`)
- `LLM_MODEL` - LLM model name (default: `granite4:1b`)

## Error Handling

### Job Processing Errors

- **Job Retries**: Failed jobs are retried up to 3 times with exponential backoff
- **Error Logging**: All errors are logged with context
- **Graceful Degradation**: If one agent fails, others continue processing
- **Error Events**: Errors are included in progress events and completion events

### Service Errors

- **IMAP Poller**: Errors don't prevent app startup; service remains disabled
- **Email Reminders**: Individual user failures don't stop the entire job
- **Inter-Container Queue**: Timeout handling and error recovery

## Monitoring

### Logging

All services use NestJS Logger with appropriate log levels:
- **INFO**: Normal operations, job starts/completions
- **WARN**: Non-critical errors, skipped operations
- **ERROR**: Critical errors, job failures

### Progress Tracking

- Progress events published via Redis event bus
- Progress history stored in processing results
- Real-time updates via WebSocket (handled by API service)

## Scaling Considerations

### Horizontal Scaling

- Multiple worker instances can process jobs from the same BullMQ queues
- Redis event bus enables distributed event publishing
- Stateless design allows easy horizontal scaling

### Performance Optimization

- **Agent Selection**: Only runs relevant agents based on task content
- **Parallel Processing**: Analysis agents run in parallel
- **Content Filtering**: Skips summarization for short content
- **Job Retention**: Automatic cleanup of old jobs

## Future Enhancements

- Agent result caching
- Custom agent configurations per board/user
- Agent processing rules (when to run which agents)
- Enhanced monitoring and metrics
- Job prioritization
- Rate limiting for agent calls
