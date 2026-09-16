-- AlterEnum
ALTER TYPE "PricingRuleType" ADD VALUE 'DURATION_DISCOUNT';

-- AlterTable
ALTER TABLE "PricingRule" ADD COLUMN     "minNights" INTEGER;
