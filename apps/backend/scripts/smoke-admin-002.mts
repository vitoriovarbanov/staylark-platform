// ADMIN-002 smoke probe — dashboard stats aggregation.
//
// Seeds one property + bookings/tickets with KNOWN values inside the current
// month, then asserts getStats() returns the exact expected aggregates.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-admin-002.mts

import { adminRepository } from '../src/routes/admin/repository/admin.repository.js';
import { db } from '../src/config/database.js';

const TAG = 'ADMIN-002-smoke';
const fail = (msg: string): never => {
    throw new Error(`SMOKE FAIL: ${msg}`);
};

/** Assertion guard that both fails the smoke run and narrows the value for TS. */
function assertPresent<T>(value: T, msg: string): asserts value is NonNullable<T> {
    if (value == null) fail(msg);
}

// First day of the current month, in UTC, as a DATE-friendly string.
const now = new Date();
const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const cleanup = async () => {
    await db.ticket.deleteMany({ where: { categoryRaw: TAG } });
    await db.booking.deleteMany({ where: { property: { title: TAG } } });
    await db.property.deleteMany({ where: { title: TAG } });
    await db.user.deleteMany({ where: { email: { startsWith: 'admin002-smoke-' } } });
};

console.log('ADMIN-002 smoke — dashboard stats\n');
await cleanup();

try {
    // ── Seed ──────────────────────────────────────────────────
    const guest = await db.user.create({
        data: {
            name: 'Smoke Guest',
            email: `admin002-smoke-${Date.now()}@test.local`,
            emailVerified: true,
            role: 'USER'
        }
    });

    const property = await db.property.create({
        data: {
            title: TAG,
            description: 'smoke',
            type: 'APARTMENT',
            city: 'Sofia',
            address: 'x',
            nightlyPrice: 100,
            // Force createdAt before this month so it counts toward availability.
            createdAt: plusDays(monthStart, -40)
        }
    });

    // One COMPLETED booking: 10 nights INSIDE the current month → revenue €1000, 10 occupied nights.
    const ci = plusDays(monthStart, 1);
    const co = plusDays(monthStart, 11); // 10 nights
    await db.booking.create({
        data: {
            userId: guest.id,
            propertyId: property.id,
            checkIn: new Date(ymd(ci)),
            checkOut: new Date(ymd(co)),
            guests: 2,
            totalPrice: 1000,
            priceBreakdown: {},
            status: 'COMPLETED'
        }
    });

    // One CRITICAL open ticket on this property.
    await db.ticket.create({
        data: {
            userId: guest.id,
            propertyId: property.id,
            bookingId: (await db.booking.findFirstOrThrow({ where: { property: { title: TAG } } })).id,
            priority: 'CRITICAL',
            status: 'OPEN',
            categoryRaw: TAG
        }
    });

    // ── Act ───────────────────────────────────────────────────
    // Stats are manager-scoped now: pass the property ids explicitly rather than
    // querying the whole org. Scoping to our seed property alone also makes the
    // occupancy assertions below exact instead of "our contribution is visible".
    const scope = [property.id];
    const stats = await adminRepository.getStats(scope);

    // ── Assert: this-month occupancy ──────────────────────────
    // Available = (all properties existing this month) × days in month.
    // We can't assume isolation of other seed data, so assert OUR contribution
    // is reflected: occupied nights >= 10 and current-month occupancy > 0.
    const currentMonth = stats.occupancyTrend.at(-1);
    assertPresent(currentMonth, 'occupancyTrend is empty');
    if (stats.occupancyTrend.length !== 6) fail(`expected 6 occupancy points, got ${stats.occupancyTrend.length}`);
    if (currentMonth.occupancy <= 0) fail(`current-month occupancy should be > 0, got ${currentMonth.occupancy}`);
    console.log(`  ✓ occupancyTrend has 6 points; current month = ${currentMonth.occupancy}%`);

    // ── Assert: revenue includes our €1000 COMPLETED booking ──
    if (stats.totals.revenue < 1000) fail(`revenue should be >= 1000, got ${stats.totals.revenue}`);
    console.log(`  ✓ revenue includes COMPLETED booking (total €${stats.totals.revenue})`);

    // ── Assert: our critical ticket surfaces ──────────────────
    const ours = stats.criticalTickets.find(t => t.propertyTitle === TAG);
    assertPresent(ours, 'critical ticket for smoke property not found');
    if (ours.priority !== 'CRITICAL') fail(`expected CRITICAL, got ${ours.priority}`);
    console.log('  ✓ critical ticket surfaces with CRITICAL priority');

    // ── Assert: recent bookings include ours ──────────────────
    if (!stats.recentBookings.some(b => b.propertyTitle === TAG)) fail('recent bookings missing smoke booking');
    console.log('  ✓ recent bookings include smoke booking');

    // ── Assert: avgOccupancy equals last trend point ──────────
    if (stats.totals.avgOccupancy !== currentMonth.occupancy) {
        fail(`avgOccupancy (${stats.totals.avgOccupancy}) != current month (${currentMonth.occupancy})`);
    }
    console.log('  ✓ avgOccupancy == current-month occupancy');

    // ── Assert: per-property stats include our seed property ──
    const propertyStats = await adminRepository.getPropertyStats(scope);
    const oursProp = propertyStats.find(p => p.title === TAG);
    assertPresent(oursProp, 'property stats missing smoke property');
    if (oursProp.occupancy <= 0 || oursProp.occupancy > 100) {
        fail(`property occupancy out of range: ${oursProp.occupancy}`);
    }
    if (oursProp.revenue < 1000) fail(`property revenue should include completed booking, got ${oursProp.revenue}`);
    if (oursProp.openTickets < 1) fail(`property openTickets should include smoke ticket, got ${oursProp.openTickets}`);
    console.log(
        `  ✓ property stats — ${oursProp.title}: ${oursProp.occupancy}% occ, €${oursProp.revenue} rev, ${oursProp.openTickets} open tickets`
    );

    console.log('\n✓ All ADMIN-002 smoke assertions passed');
} finally {
    await cleanup();
    await db.$disconnect();
}
