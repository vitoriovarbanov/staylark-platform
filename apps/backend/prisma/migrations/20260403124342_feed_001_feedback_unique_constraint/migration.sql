/*
  Warnings:

  - A unique constraint covering the columns `[userId,bookingId]` on the table `Feedback` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Feedback_propertyId_idx" ON "Feedback"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_userId_bookingId_key" ON "Feedback"("userId", "bookingId");
