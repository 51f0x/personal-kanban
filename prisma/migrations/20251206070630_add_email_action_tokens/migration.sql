-- CreateTable
CREATE TABLE "EmailActionToken" (
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

-- CreateIndex
CREATE UNIQUE INDEX "EmailActionToken_token_key" ON "EmailActionToken"("token");

-- CreateIndex
CREATE INDEX "EmailActionToken_token_idx" ON "EmailActionToken"("token");

-- CreateIndex
CREATE INDEX "EmailActionToken_taskId_idx" ON "EmailActionToken"("taskId");

-- CreateIndex
CREATE INDEX "EmailActionToken_userId_idx" ON "EmailActionToken"("userId");

-- CreateIndex
CREATE INDEX "EmailActionToken_expiresAt_idx" ON "EmailActionToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "EmailActionToken" ADD CONSTRAINT "EmailActionToken_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailActionToken" ADD CONSTRAINT "EmailActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
