import { Prisma } from '@prisma/client';
import { db } from '../../../config/database.js';

export interface QuoteLogInput {
    propertyId: string;
    checkIn: string; // 'YYYY-MM-DD'
    checkOut: string; // 'YYYY-MM-DD'
    nights: number;
    occupancy: number;
    basePrice: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
    modelVersion: string;
}

/** Pure mapping — unit-tested; keeps the DB call in `logQuote` trivial. */
export const buildQuoteLogInput = (i: QuoteLogInput): Prisma.PriceQuoteUncheckedCreateInput => ({
    propertyId: i.propertyId,
    checkIn: new Date(i.checkIn),
    checkOut: new Date(i.checkOut),
    nights: i.nights,
    occupancy: i.occupancy,
    basePrice: i.basePrice,
    totalPrice: i.totalPrice,
    modelVersion: i.modelVersion,
    converted: false
});

export const priceQuoteRepository = {
    logQuote: async (input: QuoteLogInput): Promise<void> => {
        await db.priceQuote.create({ data: buildQuoteLogInput(input) });
    },

    /**
     * Flip the most-recent matching quote to converted. Matches on
     * property + dates (quotes are anonymous at request time). Idempotent-ish:
     * if no row matches (e.g. the quote predated this feature) it no-ops.
     */
    markConverted: async (input: {
        propertyId: string;
        checkIn: string;
        checkOut: string;
        userId: string;
        bookingId: string;
    }): Promise<void> => {
        const match = await db.priceQuote.findFirst({
            where: {
                propertyId: input.propertyId,
                checkIn: new Date(input.checkIn),
                checkOut: new Date(input.checkOut),
                converted: false
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true }
        });
        if (!match) return;
        await db.priceQuote.update({
            where: { id: match.id },
            data: { converted: true, userId: input.userId, bookingId: input.bookingId }
        });
    }
};
