-- AlterEnum
ALTER TYPE "ConversationStatus" ADD VALUE 'FOLLOW_REQUIRED';

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "dmButtons" JSONB,
ADD COLUMN     "dmQuickReply" TEXT,
ADD COLUMN     "followGateButton" TEXT,
ADD COLUMN     "followGateText" TEXT,
ADD COLUMN     "followUpButtons" JSONB,
ADD COLUMN     "requireFollow" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
