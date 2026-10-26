-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'AGENCY');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPENER_SENT', 'REPLIED', 'FOLLOWUP_SENT', 'FOLLOWUP_FAILED');

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "followUpText" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "goal" TEXT,
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "igsid" TEXT NOT NULL,
    "username" TEXT,
    "commentText" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPENER_SENT',
    "error" TEXT,
    "openerAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_commentId_key" ON "Conversation"("commentId");

-- CreateIndex
CREATE INDEX "Conversation_accountId_igsid_status_idx" ON "Conversation"("accountId", "igsid", "status");

-- CreateIndex
CREATE INDEX "Conversation_accountId_openerAt_idx" ON "Conversation"("accountId", "openerAt");

-- CreateIndex
CREATE INDEX "Conversation_automationId_idx" ON "Conversation"("automationId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "IgAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
