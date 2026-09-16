-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "maxGuests" INTEGER NOT NULL DEFAULT 4;

-- CreateIndex
CREATE INDEX "Property_managerId_idx" ON "Property"("managerId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
