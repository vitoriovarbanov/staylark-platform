-- BOOK-003: PENDING Booking Expiry & Availability Fix
--
-- Adds the CancellationReason enum + nullable column on Booking, and performs
-- a one-time silent backfill that cancels all currently-stale PENDINGs.
-- Backfill runs inside the migration (not the application layer) so no emails
-- are sent for historical rows — emails only fire for future expiries handled
-- by autoTransitionStatuses in the app code.

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('MANUAL_GUEST', 'MANUAL_ADMIN', 'AUTO_EXPIRED_NO_CONFIRMATION');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "cancellationReason" "CancellationReason";

-- One-time silent backfill of stale PENDING bookings.
-- Predicate matches the runtime autoTransitionStatuses rule with hardcoded 48h.
UPDATE "Booking"
SET "status" = 'CANCELLED',
    "cancellationReason" = 'AUTO_EXPIRED_NO_CONFIRMATION',
    "updatedAt" = now()
WHERE "status" = 'PENDING'
  AND "deletedAt" IS NULL
  AND (
      "checkIn" <= CURRENT_DATE
      OR "createdAt" < now() - INTERVAL '48 hours'
  );
