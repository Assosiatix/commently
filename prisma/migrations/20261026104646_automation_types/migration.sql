-- CreateEnum
CREATE TYPE "AutomationType" AS ENUM ('REWARD', 'AGENT');

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "questionsOnly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" "AutomationType" NOT NULL DEFAULT 'REWARD';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "lastMid" TEXT,
ADD COLUMN     "turns" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
