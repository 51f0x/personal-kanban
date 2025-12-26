-- CreateEnum
CREATE TYPE api."ColumnType" AS ENUM ('INPUT', 'CLARIFY', 'CONTEXT', 'WAITING', 'SOMEDAY', 'DONE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE api."TaskContext" AS ENUM ('EMAIL', 'MEETING', 'PHONE', 'READ', 'WATCH', 'DESK', 'OTHER');

-- CreateEnum
CREATE TYPE api."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE api."TaskEventType" AS ENUM ('CREATED', 'UPDATED', 'MOVED', 'COMPLETED', 'STALE', 'RULE_TRIGGERED');

-- CreateTable
CREATE TABLE api."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "defaultBoardId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."Board" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."Column" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" api."ColumnType" NOT NULL DEFAULT 'INPUT',
    "wipLimit" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Column_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."Project" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "desiredOutcome" TEXT,
    "status" TEXT DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."Task" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "columnId" UUID NOT NULL,
    "projectId" UUID,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "context" api."TaskContext",
    "waitingFor" TEXT,
    "dueAt" TIMESTAMP(3),
    "priority" api."TaskPriority",
    "duration" TEXT,
    "needsBreakdown" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastMovedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."ChecklistItem" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."Tag" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#94a3b8',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."TaskTag" (
    "taskId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "TaskTag_pkey" PRIMARY KEY ("taskId","tagId")
);

-- CreateTable
CREATE TABLE api."TaskEvent" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "type" api."TaskEventType" NOT NULL,
    "fromColumnId" UUID,
    "toColumnId" UUID,
    "payload" JSONB,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."Rule" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "trigger" JSONB NOT NULL,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."RecurringTemplate" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "payload" JSONB NOT NULL,
    "rrule" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."Hint" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "agentId" TEXT NOT NULL,
    "hintType" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "data" JSONB,
    "confidence" DOUBLE PRECISION,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."EmailActionToken" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'complete',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE api."LocalBrain" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "objective" TEXT NOT NULL DEFAULT '',
    "context" JSONB,
    "constraints" JSONB,
    "openQuestions" JSONB,
    "taskBacklog" JSONB,
    "researchPlan" JSONB,
    "sources" JSONB,
    "decisions" JSONB,
    "risks" JSONB,
    "deliverables" JSONB,
    "history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalBrain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON api."User"("email");

-- CreateIndex
CREATE INDEX "User_defaultBoardId_idx" ON api."User"("defaultBoardId");

-- CreateIndex
CREATE INDEX "Board_ownerId_idx" ON api."Board"("ownerId");

-- CreateIndex
CREATE INDEX "Column_boardId_idx" ON api."Column"("boardId");

-- CreateIndex
CREATE INDEX "Project_boardId_idx" ON api."Project"("boardId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON api."Project"("ownerId");

-- CreateIndex
CREATE INDEX "Task_boardId_idx" ON api."Task"("boardId");

-- CreateIndex
CREATE INDEX "Task_columnId_idx" ON api."Task"("columnId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON api."Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_ownerId_idx" ON api."Task"("ownerId");

-- CreateIndex
CREATE INDEX "Task_stale_idx" ON api."Task"("stale");

-- CreateIndex
CREATE INDEX "Task_columnId_position_idx" ON api."Task"("columnId", "position");

-- CreateIndex
CREATE INDEX "ChecklistItem_taskId_idx" ON api."ChecklistItem"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_boardId_name_key" ON api."Tag"("boardId", "name");

-- CreateIndex
CREATE INDEX "TaskEvent_boardId_idx" ON api."TaskEvent"("boardId");

-- CreateIndex
CREATE INDEX "TaskEvent_taskId_idx" ON api."TaskEvent"("taskId");

-- CreateIndex
CREATE INDEX "Rule_boardId_idx" ON api."Rule"("boardId");

-- CreateIndex
CREATE INDEX "Rule_ownerId_idx" ON api."Rule"("ownerId");

-- CreateIndex
CREATE INDEX "RecurringTemplate_boardId_idx" ON api."RecurringTemplate"("boardId");

-- CreateIndex
CREATE INDEX "RecurringTemplate_ownerId_idx" ON api."RecurringTemplate"("ownerId");

-- CreateIndex
CREATE INDEX "Hint_taskId_idx" ON api."Hint"("taskId");

-- CreateIndex
CREATE INDEX "Hint_agentId_idx" ON api."Hint"("agentId");

-- CreateIndex
CREATE INDEX "Hint_hintType_idx" ON api."Hint"("hintType");

-- CreateIndex
CREATE INDEX "Hint_applied_idx" ON api."Hint"("applied");

-- CreateIndex
CREATE UNIQUE INDEX "EmailActionToken_token_key" ON api."EmailActionToken"("token");

-- CreateIndex
CREATE INDEX "EmailActionToken_token_idx" ON api."EmailActionToken"("token");

-- CreateIndex
CREATE INDEX "EmailActionToken_taskId_idx" ON api."EmailActionToken"("taskId");

-- CreateIndex
CREATE INDEX "EmailActionToken_userId_idx" ON api."EmailActionToken"("userId");

-- CreateIndex
CREATE INDEX "EmailActionToken_expiresAt_idx" ON api."EmailActionToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LocalBrain_projectId_key" ON api."LocalBrain"("projectId");

-- CreateIndex
CREATE INDEX "LocalBrain_projectId_idx" ON api."LocalBrain"("projectId");

-- AddForeignKey
ALTER TABLE api."Board" ADD CONSTRAINT "Board_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES api."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."User" ADD CONSTRAINT "User_defaultBoardId_fkey" FOREIGN KEY ("defaultBoardId") REFERENCES api."Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Column" ADD CONSTRAINT "Column_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES api."Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Project" ADD CONSTRAINT "Project_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES api."Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES api."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Task" ADD CONSTRAINT "Task_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES api."Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Task" ADD CONSTRAINT "Task_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES api."Column"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES api."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES api."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."ChecklistItem" ADD CONSTRAINT "ChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES api."Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Tag" ADD CONSTRAINT "Tag_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES api."Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."TaskTag" ADD CONSTRAINT "TaskTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES api."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."TaskTag" ADD CONSTRAINT "TaskTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES api."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."TaskEvent" ADD CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES api."Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."TaskEvent" ADD CONSTRAINT "TaskEvent_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES api."Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Rule" ADD CONSTRAINT "Rule_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES api."Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Rule" ADD CONSTRAINT "Rule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES api."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES api."Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES api."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."Hint" ADD CONSTRAINT "Hint_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES api."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."EmailActionToken" ADD CONSTRAINT "EmailActionToken_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES api."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."EmailActionToken" ADD CONSTRAINT "EmailActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES api."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE api."LocalBrain" ADD CONSTRAINT "LocalBrain_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES api."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
