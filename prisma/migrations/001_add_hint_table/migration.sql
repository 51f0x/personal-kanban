-- CreateTable
CREATE TABLE "Hint" (
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

-- CreateIndex
CREATE INDEX "Hint_taskId_idx" ON "Hint"("taskId");

-- CreateIndex
CREATE INDEX "Hint_agentId_idx" ON "Hint"("agentId");

-- CreateIndex
CREATE INDEX "Hint_hintType_idx" ON "Hint"("hintType");

-- CreateIndex
CREATE INDEX "Hint_applied_idx" ON "Hint"("applied");

-- AddForeignKey
ALTER TABLE "Hint" ADD CONSTRAINT "Hint_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

