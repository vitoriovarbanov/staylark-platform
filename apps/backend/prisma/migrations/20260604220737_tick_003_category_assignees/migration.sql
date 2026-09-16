-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "needsAssignment" BOOLEAN NOT NULL DEFAULT false;

-- Existing unresolved tickets become "needs triage" since the mapping table starts empty.
UPDATE "Ticket" SET "needsAssignment" = true WHERE "status" IN ('OPEN', 'IN_PROGRESS') AND "assignedToId" IS NULL;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "routeTo";

-- DropEnum
DROP TYPE "TicketRouteTarget";

-- CreateTable
CREATE TABLE "ticket_category_assignee" (
    "id" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_category_assignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_category_assignee_category_idx" ON "ticket_category_assignee"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_category_assignee_category_userId_key" ON "ticket_category_assignee"("category", "userId");

-- CreateIndex
CREATE INDEX "Ticket_needsAssignment_idx" ON "Ticket"("needsAssignment");

-- AddForeignKey
ALTER TABLE "ticket_category_assignee" ADD CONSTRAINT "ticket_category_assignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
