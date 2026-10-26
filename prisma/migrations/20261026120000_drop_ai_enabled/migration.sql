-- AI is now the AGENT automation type instead of a switch on every automation.
ALTER TABLE "Automation" DROP COLUMN "aiEnabled";
