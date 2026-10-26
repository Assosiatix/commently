-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiInstructions" TEXT;

-- AlterTable
ALTER TABLE "EventLog" ADD COLUMN     "aiMeta" JSONB;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "igsid" TEXT NOT NULL,
    "username" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentCount" INTEGER NOT NULL DEFAULT 1,
    "lastComment" TEXT,
    "lastIntent" TEXT,
    "products" TEXT[],
    "needsAttention" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'new',
    "note" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_accountId_lastSeenAt_idx" ON "Lead"("accountId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_accountId_igsid_key" ON "Lead"("accountId", "igsid");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "IgAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
