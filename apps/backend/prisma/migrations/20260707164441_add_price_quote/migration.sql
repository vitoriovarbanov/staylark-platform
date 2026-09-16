-- CreateTable
CREATE TABLE "PriceQuote" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "occupancy" DOUBLE PRECISION NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceQuote_bookingId_key" ON "PriceQuote"("bookingId");

-- CreateIndex
CREATE INDEX "PriceQuote_propertyId_checkIn_checkOut_idx" ON "PriceQuote"("propertyId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "PriceQuote_converted_idx" ON "PriceQuote"("converted");

-- CreateIndex
CREATE INDEX "PriceQuote_createdAt_idx" ON "PriceQuote"("createdAt");

-- AddForeignKey
ALTER TABLE "PriceQuote" ADD CONSTRAINT "PriceQuote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceQuote" ADD CONSTRAINT "PriceQuote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
