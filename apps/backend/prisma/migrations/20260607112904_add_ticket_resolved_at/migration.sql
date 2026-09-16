-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- Backfill: tickets already RESOLVED before this migration have no resolvedAt.
-- Use updatedAt as the best available proxy so historical resolutions still
-- appear in resolution-speed metrics (avg/median/resolvedInRange). Without this,
-- statusCounts.resolved would count them while the speed metrics silently drop them.
UPDATE "Ticket" SET "resolvedAt" = "updatedAt" WHERE status = 'RESOLVED' AND "resolvedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Ticket_resolvedAt_idx" ON "Ticket"("resolvedAt");
