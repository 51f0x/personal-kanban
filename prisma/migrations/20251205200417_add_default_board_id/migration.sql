-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultBoardId" UUID;

-- CreateIndex
CREATE INDEX "User_defaultBoardId_idx" ON "User"("defaultBoardId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultBoardId_fkey" FOREIGN KEY ("defaultBoardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;
