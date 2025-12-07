# Email Reminder Worker Feature

## Overview

The email reminder worker automatically sends prioritized work package emails to users based on their tasks across all boards. The emails include:

- Prioritized tasks sorted by urgency, due dates, priority, and estimated duration
- Direct links to view tasks in the web app
- One-click task completion links
- Beautiful HTML email templates with task details

## Features

### 1. Task Prioritization

Tasks are prioritized using a scoring algorithm (0-100) that considers:

- **Due Date Urgency** (0-50 points):
  - Overdue: 50+ points (extra points for each day overdue)
  - Due today: 40 points
  - Due tomorrow: 35 points
  - Due in 2-3 days: 30 points
  - Due this week: 20 points
  - Due in 2 weeks: 10 points
  - Due later: 5 points

- **Task Priority** (0-30 points):
  - HIGH: 30 points
  - MEDIUM: 15 points
  - LOW: 5 points

- **Duration Bonus** (0-10 points):
  - Very quick tasks (≤15 min): 10 points
  - Quick tasks (≤30 min): 7 points
  - Short tasks (≤1 hour): 5 points
  - Medium tasks (≤2 hours): 3 points

- **Column Type Bonus** (0-10 points):
  - INPUT: 10 points (most actionable)
  - CLARIFY: 8 points
  - CONTEXT: 5 points
  - WAITING: 2 points
  - SOMEDAY: 0 points

### 2. Email Content

Each email includes:

- Summary statistics (total tasks, urgent tasks, overdue tasks)
- Tasks grouped by priority:
  - 🚨 Urgent Tasks (priority score ≥ 80)
  - ⚡ High Priority Tasks (priority score 60-79)
  - 📋 Other Tasks (priority score < 60)
- For each task:
  - Title and description
  - Due date with visual indicators (overdue, due soon, etc.)
  - Estimated duration
  - Board and column information
  - Priority badge
  - "View Task" button (links to web app)
  - "Mark Complete" button (one-click completion)

### 3. Secure Task Completion

- Each email contains secure, time-limited tokens for task completion
- Tokens expire after 7 days
- Tokens can only be used once
- Completion automatically moves tasks to the DONE column

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# SMTP Configuration (required for email sending)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-username
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@example.com

# Email Reminder Settings
EMAIL_REMINDERS_ENABLED=true
EMAIL_REMINDER_INTERVAL_HOURS=24  # How often to send reminders (default: 24 hours)
EMAIL_MAX_TASKS_PER_EMAIL=10      # Maximum tasks per email (default: 10)

# Web App URL (for email links)
WEB_URL=http://localhost:5173      # Or your production URL
```

### Worker Configuration

The email reminder worker runs automatically when the worker service starts. It:

1. Sends reminders immediately on startup (if enabled)
2. Runs on a configurable interval (default: every 24 hours)
3. Processes all users with active tasks
4. Skips users with no tasks

## Database Schema

### EmailActionToken Model

```prisma
model EmailActionToken {
  id        String   @id @default(uuid())
  taskId    String
  userId    String
  token     String   @unique
  action    String   @default("complete")
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  
  task      Task     @relation(...)
  user      User     @relation(...)
}
```

## API Endpoints

### Complete Task via Email Link

```
GET /api/v1/email-actions/complete?token=<token>
```

- Validates the token
- Checks expiration and usage
- Moves task to DONE column
- Redirects to task view in web app

### View Task via Email Link

```
GET /api/v1/email-actions/view?token=<token>
```

- Validates the token
- Checks expiration
- Redirects to task view in web app

## Architecture

### Components

1. **EmailService** (`apps/worker/src/modules/notifications/email.service.ts`)
   - Handles SMTP connection and email sending
   - Generates HTML and text email templates
   - Formats task information for display

2. **TaskPrioritizerService** (`apps/worker/src/modules/notifications/task-prioritizer.service.ts`)
   - Queries user tasks across all boards
   - Calculates priority scores
   - Sorts and limits tasks for email

3. **EmailReminderWorker** (`apps/worker/src/modules/notifications/email-reminder.worker.ts`)
   - Scheduled worker that runs periodically
   - Processes all users
   - Creates secure tokens for email links
   - Sends emails via EmailService

4. **EmailActionsService** (`apps/api/src/modules/email-actions/email-actions.service.ts`)
   - Validates email tokens
   - Completes tasks via secure links
   - Handles token expiration and usage

5. **EmailActionsController** (`apps/api/src/modules/email-actions/email-actions.controller.ts`)
   - HTTP endpoints for email actions
   - Redirects to web app after completion

## Usage

### Running the Worker

The email reminder worker starts automatically with the worker service:

```bash
cd apps/worker
pnpm dev
```

### Testing Email Sending

1. Configure SMTP settings in `.env`
2. Ensure you have tasks with due dates and priorities
3. Start the worker service
4. Check your email inbox (or MailHog if using local development)

### Local Development with MailHog

For local development, use MailHog (included in docker-compose.yml):

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=noreply@localhost
```

View emails at: http://localhost:8025

## Email Template

The email uses a responsive HTML template with:

- Clean, modern design
- Color-coded priority indicators
- Visual due date warnings (overdue, due soon)
- Mobile-friendly layout
- Plain text fallback

## Security Considerations

1. **Token Security**:
   - Tokens are 64-character hex strings (32 bytes)
   - Generated using cryptographically secure random bytes
   - Stored securely in database
   - Expire after 7 days

2. **Token Usage**:
   - One-time use only
   - Validated before task completion
   - Expired tokens are rejected

3. **Task Access**:
   - Tokens are tied to specific users and tasks
   - Cannot be used to access other users' tasks
   - Completion requires valid token

## Future Enhancements

Potential improvements:

1. User preferences for reminder frequency
2. Customizable email templates per user
3. Digest mode (daily/weekly summaries)
4. Task filtering (exclude certain columns/boards)
5. Time-based reminders (morning/evening)
6. Integration with calendar systems
7. Task grouping by project or context

## Troubleshooting

### Emails Not Sending

1. Check SMTP configuration in `.env`
2. Verify `EMAIL_REMINDERS_ENABLED=true`
3. Check worker logs for errors
4. Ensure SMTP credentials are correct
5. Test SMTP connection manually

### Tasks Not Appearing in Emails

1. Ensure tasks are not marked as done
2. Check that tasks are not in DONE or ARCHIVE columns
3. Verify tasks have owners
4. Check priority scores in logs

### Token Errors

1. Verify tokens haven't expired (7-day limit)
2. Check if token was already used
3. Ensure database migration was applied
4. Check API logs for validation errors

## Migration

To apply the database migration:

```bash
npx prisma migrate dev
```

This creates the `EmailActionToken` table and adds necessary indexes.
