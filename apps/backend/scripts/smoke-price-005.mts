// PRICE-005 smoke probe — service-layer end-to-end:
// 1. Quote a future date range
// 2. Create a booking
// 3. Assert priceBreakdown round-trips, sum invariant holds, lockedNightlyPrice is absent

import { pricingService } from '../src/routes/pricing/service/pricing.service.js';
import { bookingsService } from '../src/routes/bookings/service/bookings.service.js';
import { db } from '../src/config/database.js';

const SEED_GUEST_ID = '00000000-0000-4000-a000-000000000001';
const SEED_PROPERTY_ID = '00000000-0000-4000-b000-000000000004'; // Plovdiv — has no future-bookings conflict

const today = new Date();
const checkIn = new Date(today);
checkIn.setUTCDate(today.getUTCDate() + 90);
const checkOut = new Date(checkIn);
checkOut.setUTCDate(checkIn.getUTCDate() + 3);
const checkInStr = checkIn.toISOString().slice(0, 10);
const checkOutStr = checkOut.toISOString().slice(0, 10);

console.log(`Probing booking for ${SEED_PROPERTY_ID}, ${checkInStr} → ${checkOutStr}`);

const quote = await pricingService.quote(SEED_PROPERTY_ID, checkInStr, checkOutStr);
console.log('quote.breakdown:', JSON.stringify(quote.breakdown, null, 2));
console.log('quote.totalPrice:', quote.totalPrice);

const booking = await bookingsService.create(
    {
        propertyId: SEED_PROPERTY_ID,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guests: 1
    },
    SEED_GUEST_ID
);

console.log('booking.id:', booking.id);
console.log('booking.priceBreakdown:', JSON.stringify(booking.priceBreakdown, null, 2));

const sum = booking.priceBreakdown.reduce((s: number, n: { price: number }) => s + n.price, 0);
if (Math.abs(sum - booking.totalPrice) > 0.01) {
    throw new Error(`Sum invariant broken: sum=${sum} totalPrice=${booking.totalPrice}`);
}
if ('lockedNightlyPrice' in booking) {
    throw new Error('lockedNightlyPrice leaked into response');
}
if (booking.priceBreakdown.length !== 3) {
    throw new Error(`Expected 3 nights, got ${booking.priceBreakdown.length}`);
}
for (let i = 0; i < quote.breakdown.length; i++) {
    const q = quote.breakdown[i];
    const b = booking.priceBreakdown[i];
    if (q.date !== b.date || q.price !== b.price || q.appliedRules.join(',') !== b.appliedRules.join(',')) {
        throw new Error(`Element ${i} mismatch: quote=${JSON.stringify(q)} booking=${JSON.stringify(b)}`);
    }
}
console.log('✓ Smoke OK — element-wise match, sum invariant, no lockedNightlyPrice');

await db.booking.delete({ where: { id: booking.id } });
console.log('✓ Cleaned up test booking');

await db.$disconnect();
process.exit(0);
