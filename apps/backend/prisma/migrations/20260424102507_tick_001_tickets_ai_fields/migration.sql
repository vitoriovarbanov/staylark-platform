-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('NOISE', 'DAMAGE', 'CLEANLINESS', 'DELIVERY', 'UTILITIES', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "TicketRouteTarget" AS ENUM ('BUILDING_MANAGER', 'MAINTENANCE', 'SUPPLIER', 'ADMIN');

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "audioUrl",
ADD COLUMN     "categoryRaw" TEXT,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routeTo" "TicketRouteTarget" NOT NULL DEFAULT 'ADMIN',
DROP COLUMN "category",
ADD COLUMN     "category" "TicketCategory";

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");

-- CreateIndex
CREATE INDEX "Ticket_propertyId_idx" ON "Ticket"("propertyId");
