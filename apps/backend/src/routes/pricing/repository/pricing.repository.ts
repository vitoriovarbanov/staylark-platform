import { db } from '../../../config/database.js';
import { Prisma } from '@prisma/client';

export interface PropertyPricingData {
    id: string;
    nightlyPrice: Prisma.Decimal;
    minNightlyPrice: Prisma.Decimal | null;
    maxNightlyPrice: Prisma.Decimal | null;
}

export interface ActiveOverride {
    id: string;
    name: string;
    multiplier: Prisma.Decimal;
    startDate: Date;
    endDate: Date;
}

const OCCUPANCY_WINDOW_DAYS = 30;

export const pricingRepository = {
    findProperty: async (propertyId: string): Promise<PropertyPricingData | null> => {
        return db.property.findFirst({
            where: { id: propertyId, deletedAt: null },
            select: {
                id: true,
                nightlyPrice: true,
                minNightlyPrice: true,
                maxNightlyPrice: true
            }
        });
    },

    /**
     * Occupancy = (booked nights in next 30 days) / 30.
     * Excludes CANCELLED and soft-deleted bookings.
     */
    computeOccupancyRate: async (propertyId: string, fromDate: Date): Promise<number> => {
        const to = new Date(fromDate);
        to.setUTCDate(to.getUTCDate() + OCCUPANCY_WINDOW_DAYS);

        const bookings = await db.booking.findMany({
            where: {
                propertyId,
                deletedAt: null,
                status: { not: 'CANCELLED' },
                checkIn: { lt: to },
                checkOut: { gt: fromDate }
            },
            select: { checkIn: true, checkOut: true }
        });

        let bookedNights = 0;
        for (const b of bookings) {
            const start = b.checkIn < fromDate ? fromDate : b.checkIn;
            const end = b.checkOut > to ? to : b.checkOut;
            const ms = end.getTime() - start.getTime();
            if (ms > 0) bookedNights += Math.round(ms / (24 * 60 * 60 * 1000));
        }
        return Math.min(1, bookedNights / OCCUPANCY_WINDOW_DAYS);
    },

    findActiveOverridesInRange: async (
        propertyId: string,
        rangeStart: Date,
        rangeEnd: Date
    ): Promise<ActiveOverride[]> => {
        return db.pricingRule.findMany({
            where: {
                isActive: true,
                type: { not: 'DURATION_DISCOUNT' }, // PRICE-007: duration applied post-quote
                OR: [{ propertyId }, { propertyId: null }],
                startDate: { lt: rangeEnd },
                endDate: { gte: rangeStart }
            },
            select: {
                id: true,
                name: true,
                multiplier: true,
                startDate: true,
                endDate: true
            }
        });
    },

    /**
     * PRICE-007: Returns the single best-tier DURATION_DISCOUNT rule that:
     *   - is active,
     *   - is scoped to this property OR global (propertyId IS NULL),
     *   - has a validity window that *covers* the entire stay (strict — Airbnb-style),
     *   - has minNights <= nights.
     *
     * Tie-break: highest minNights wins (best tier), then lowest multiplier
     * (better discount for the guest). At most one rule is returned — duration
     * tiers do not stack.
     */
    findDurationDiscountForStay: async (
        propertyId: string,
        checkIn: Date,
        checkOut: Date,
        nights: number
    ): Promise<{ id: string; name: string; multiplier: Prisma.Decimal; minNights: number } | null> => {
        const row = await db.pricingRule.findFirst({
            where: {
                isActive: true,
                type: 'DURATION_DISCOUNT',
                OR: [{ propertyId }, { propertyId: null }],
                startDate: { lte: checkIn },
                endDate: { gte: checkOut },
                minNights: { lte: nights }
            },
            orderBy: [{ minNights: 'desc' }, { multiplier: 'asc' }],
            select: { id: true, name: true, multiplier: true, minNights: true }
        });
        if (!row || row.minNights === null) return null;
        return { id: row.id, name: row.name, multiplier: row.multiplier, minNights: row.minNights };
    }
};
