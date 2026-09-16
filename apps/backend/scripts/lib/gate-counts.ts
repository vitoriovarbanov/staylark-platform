import { db } from '../../src/config/database.js';
import type { GateCounts } from '../../src/routes/pricing/service/pricing-gate.js';

/**
 * Single source of truth for the gate measurement, shared by `_count-bookings.ts`
 * (inspect) and `train-pricing-model-real.ts` (enforce) so the number you check
 * always equals the number the gate acts on. `monthsSpanned` counts DISTINCT
 * calendar months containing a booking (not earliest→latest span), which is the
 * stronger anti-overfit signal. Booking dates are DATE → UTC-midnight, so bucket
 * on UTC. Soft-delete aware; cancellations excluded.
 */
export const countGateInputs = async (): Promise<GateCounts> => {
    const rows = await db.booking.findMany({
        where: { status: { not: 'CANCELLED' }, deletedAt: null },
        select: { propertyId: true, checkIn: true }
    });
    return {
        bookings: rows.length,
        properties: new Set(rows.map(r => r.propertyId)).size,
        monthsSpanned: new Set(rows.map(r => `${r.checkIn.getUTCFullYear()}-${r.checkIn.getUTCMonth()}`)).size
    };
};
