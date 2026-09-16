// Seed rich feedback test data for manual validation of the admin feedback dashboard.
//
// Creates, for the Varna Seaside House (rich/normal) and Plovdiv Old Town (empty-prev edge)
// seed properties: completed bookings (some without feedback) + feedback spread across the
// current and previous 30-day windows, covering all sentiments, scores 1–5, voice/text mix,
// and negatives for the needs-attention panel.
//
// All rows use id prefixes fa/fb/fd000000-… so they can be removed cleanly.
//
// Run:   cd apps/backend && pnpm exec tsx --env-file=.env scripts/seed-feedback-testdata.mts
// Clean: cd apps/backend && pnpm exec tsx --env-file=.env scripts/seed-feedback-testdata.mts --clean

import { db } from '../src/config/database.js';

const CLEAN = process.argv.includes('--clean');

const VARNA = '00000000-0000-4000-b000-000000000003';
const PLOVDIV = '00000000-0000-4000-b000-000000000004';

const USER_ID = 'fa000000-0000-4000-8000-000000000001';
const BOOKING_PREFIX = 'fb000000';
const FEEDBACK_PREFIX = 'fd000000';

const uuid = (prefix: string, n: number) =>
    `${prefix}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

const d = (s: string) => new Date(`${s}T12:00:00.000Z`);
const dateOnly = (s: string) => new Date(`${s}T00:00:00.000Z`);

type Sent = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
interface FbRow {
    propertyId: string;
    createdAt: string; // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD (must fall in the same window for response-rate denominator)
    sentiment: Sent;
    score: number;
    voice: boolean;
    summary: string;
    topics: string[];
}
// Completed bookings WITHOUT feedback (dilute response rate). Just need checkOut in a window.
interface BareBooking {
    propertyId: string;
    checkOut: string;
}

// ── Varna: current window (2026-05-11 … 06-09), ~14 feedback across ~4 weeks ──
const varnaCurrent: FbRow[] = [
    { propertyId: VARNA, createdAt: '2026-05-12', checkOut: '2026-05-11', sentiment: 'POSITIVE', score: 5, voice: true, summary: 'Amazing sea views and spotless apartment, would return in a heartbeat.', topics: ['location', 'cleanliness', 'comfort'] },
    { propertyId: VARNA, createdAt: '2026-05-13', checkOut: '2026-05-12', sentiment: 'POSITIVE', score: 4, voice: false, summary: 'Great location near the beach, WiFi was a touch slow.', topics: ['location', 'internet'] },
    { propertyId: VARNA, createdAt: '2026-05-15', checkOut: '2026-05-14', sentiment: 'NEGATIVE', score: 1, voice: true, summary: 'Arrived to a dirty kitchen and the AC did not work for two days.', topics: ['cleanliness', 'maintenance', 'comfort'] },
    { propertyId: VARNA, createdAt: '2026-05-19', checkOut: '2026-05-18', sentiment: 'NEUTRAL', score: 3, voice: false, summary: 'Decent stay but street noise at night was noticeable.', topics: ['noise', 'location'] },
    { propertyId: VARNA, createdAt: '2026-05-20', checkOut: '2026-05-19', sentiment: 'POSITIVE', score: 5, voice: false, summary: 'The garden was perfect for evening barbecues, lovely host.', topics: ['amenities', 'service'] },
    { propertyId: VARNA, createdAt: '2026-05-22', checkOut: '2026-05-21', sentiment: 'POSITIVE', score: 4, voice: true, summary: 'Comfortable beds and a well equipped kitchen.', topics: ['comfort', 'amenities'] },
    { propertyId: VARNA, createdAt: '2026-05-26', checkOut: '2026-05-25', sentiment: 'NEGATIVE', score: 2, voice: false, summary: 'Hot water kept cutting out and the landlord was hard to reach.', topics: ['maintenance', 'service'] },
    { propertyId: VARNA, createdAt: '2026-05-27', checkOut: '2026-05-26', sentiment: 'NEUTRAL', score: 3, voice: false, summary: 'Fine for a short stay, parking was a nightmare though.', topics: ['parking', 'location'] },
    { propertyId: VARNA, createdAt: '2026-06-01', checkOut: '2026-05-31', sentiment: 'POSITIVE', score: 5, voice: true, summary: 'Exceptional value and the cleanest place we have stayed in Varna.', topics: ['price', 'cleanliness'] },
    { propertyId: VARNA, createdAt: '2026-06-02', checkOut: '2026-06-01', sentiment: 'POSITIVE', score: 4, voice: false, summary: 'Very close to restaurants and the seafront promenade.', topics: ['location'] },
    { propertyId: VARNA, createdAt: '2026-06-04', checkOut: '2026-06-03', sentiment: 'NEGATIVE', score: 2, voice: true, summary: 'Photos were misleading and the place felt smaller than advertised.', topics: ['comfort', 'accuracy'] },
    { propertyId: VARNA, createdAt: '2026-06-06', checkOut: '2026-06-05', sentiment: 'POSITIVE', score: 5, voice: false, summary: 'Wonderful balcony view and very responsive host.', topics: ['location', 'service', 'comfort'] },
    { propertyId: VARNA, createdAt: '2026-06-08', checkOut: '2026-06-07', sentiment: 'NEUTRAL', score: 3, voice: false, summary: 'Average overall, nothing memorable but nothing terrible.', topics: ['comfort'] },
    { propertyId: VARNA, createdAt: '2026-06-09', checkOut: '2026-06-08', sentiment: 'POSITIVE', score: 4, voice: true, summary: 'Clean, quiet and a great price for the location.', topics: ['cleanliness', 'price', 'noise'] }
];

// ── Varna: previous window (2026-04-11 … 05-10), ~8 feedback (different profile) ──
const varnaPrevious: FbRow[] = [
    { propertyId: VARNA, createdAt: '2026-04-13', checkOut: '2026-04-12', sentiment: 'POSITIVE', score: 4, voice: false, summary: 'Good stay overall, nice neighbourhood.', topics: ['location'] },
    { propertyId: VARNA, createdAt: '2026-04-16', checkOut: '2026-04-15', sentiment: 'NEUTRAL', score: 3, voice: false, summary: 'Okay apartment, a bit dated.', topics: ['comfort'] },
    { propertyId: VARNA, createdAt: '2026-04-20', checkOut: '2026-04-19', sentiment: 'POSITIVE', score: 4, voice: true, summary: 'Loved the sea breeze in the mornings.', topics: ['location', 'comfort'] },
    { propertyId: VARNA, createdAt: '2026-04-24', checkOut: '2026-04-23', sentiment: 'NEUTRAL', score: 3, voice: false, summary: 'Reasonable but the shower pressure was weak.', topics: ['maintenance'] },
    { propertyId: VARNA, createdAt: '2026-04-28', checkOut: '2026-04-27', sentiment: 'POSITIVE', score: 3, voice: false, summary: 'Pleasant enough for the price.', topics: ['price'] },
    { propertyId: VARNA, createdAt: '2026-05-02', checkOut: '2026-05-01', sentiment: 'NEGATIVE', score: 2, voice: false, summary: 'Noisy neighbours and thin walls.', topics: ['noise'] },
    { propertyId: VARNA, createdAt: '2026-05-05', checkOut: '2026-05-04', sentiment: 'POSITIVE', score: 4, voice: true, summary: 'Great host, smooth check-in.', topics: ['service', 'check_in'] },
    { propertyId: VARNA, createdAt: '2026-05-08', checkOut: '2026-05-07', sentiment: 'NEUTRAL', score: 3, voice: false, summary: 'Middle of the road experience.', topics: ['comfort'] }
];

// ── Plovdiv: current-window ONLY (no prior feedback) → tests empty-previous-window deltas ──
const plovdivCurrent: FbRow[] = [
    { propertyId: PLOVDIV, createdAt: '2026-05-18', checkOut: '2026-05-17', sentiment: 'POSITIVE', score: 5, voice: false, summary: 'Charming old-town flat full of character.', topics: ['location', 'comfort'] },
    { propertyId: PLOVDIV, createdAt: '2026-05-24', checkOut: '2026-05-23', sentiment: 'POSITIVE', score: 4, voice: true, summary: 'Beautiful architecture, slightly noisy from the bars below.', topics: ['location', 'noise'] },
    { propertyId: PLOVDIV, createdAt: '2026-05-30', checkOut: '2026-05-29', sentiment: 'NEUTRAL', score: 3, voice: false, summary: 'Nice but the stairs were steep with luggage.', topics: ['comfort'] },
    { propertyId: PLOVDIV, createdAt: '2026-06-05', checkOut: '2026-06-04', sentiment: 'POSITIVE', score: 4, voice: false, summary: 'Cozy and well located for sightseeing.', topics: ['location'] },
    { propertyId: PLOVDIV, createdAt: '2026-06-07', checkOut: '2026-06-06', sentiment: 'NEGATIVE', score: 2, voice: true, summary: 'Cleanliness was below expectations on arrival.', topics: ['cleanliness'] }
];

// Completed bookings WITHOUT feedback to make response rate < 100%.
const bareBookings: BareBooking[] = [
    // Varna current window (6) → 14 with + 6 without = 20 completed → 70% response
    ...['2026-05-13', '2026-05-21', '2026-05-28', '2026-06-02', '2026-06-05', '2026-06-09'].map(checkOut => ({ propertyId: VARNA, checkOut })),
    // Varna previous window (8) → 8 with + 8 without = 16 completed → 50% response
    ...['2026-04-12', '2026-04-15', '2026-04-19', '2026-04-23', '2026-04-27', '2026-05-01', '2026-05-04', '2026-05-07'].map(checkOut => ({ propertyId: VARNA, checkOut })),
    // Plovdiv current window (2) → 5 with + 2 without = 7 completed → ~71% response
    ...['2026-05-20', '2026-06-03'].map(checkOut => ({ propertyId: PLOVDIV, checkOut }))
];

async function clean() {
    const fb = await db.feedback.deleteMany({ where: { id: { startsWith: FEEDBACK_PREFIX } } });
    const bk = await db.booking.deleteMany({ where: { id: { startsWith: BOOKING_PREFIX } } });
    const us = await db.user.deleteMany({ where: { id: USER_ID } });
    console.log(`Cleaned: ${fb.count} feedback, ${bk.count} bookings, ${us.count} user`);
}

async function main() {
    // Always clean first so re-runs are idempotent.
    await clean();
    if (CLEAN) {
        await db.$disconnect();
        return;
    }

    await db.user.create({
        data: {
            id: USER_ID,
            name: 'Feedback Seed Tester',
            email: 'feedback-seed@test.local',
            emailVerified: true,
            role: 'USER',
            subscriptionTier: 'BASIC'
        }
    });

    let bIdx = 1;
    let fIdx = 1;
    const allFeedback = [...varnaCurrent, ...varnaPrevious, ...plovdivCurrent];

    for (const row of allFeedback) {
        const bookingId = uuid(BOOKING_PREFIX, bIdx++);
        const checkOut = dateOnly(row.checkOut);
        const checkIn = new Date(checkOut.getTime() - 3 * 24 * 60 * 60 * 1000);
        await db.booking.create({
            data: {
                id: bookingId,
                userId: USER_ID,
                propertyId: row.propertyId,
                checkIn,
                checkOut,
                guests: 2,
                totalPrice: 150,
                priceBreakdown: [],
                status: 'COMPLETED'
            }
        });
        await db.feedback.create({
            data: {
                id: uuid(FEEDBACK_PREFIX, fIdx++),
                userId: USER_ID,
                propertyId: row.propertyId,
                bookingId,
                audioUrl: row.voice ? 'https://example.com/audio/seed.webm' : null,
                transcription: row.summary,
                sentiment: row.sentiment,
                topics: row.topics,
                score: row.score,
                summary: row.summary,
                createdAt: d(row.createdAt),
                updatedAt: d(row.createdAt)
            }
        });
    }

    for (const bb of bareBookings) {
        const bookingId = uuid(BOOKING_PREFIX, bIdx++);
        const checkOut = dateOnly(bb.checkOut);
        const checkIn = new Date(checkOut.getTime() - 3 * 24 * 60 * 60 * 1000);
        await db.booking.create({
            data: {
                id: bookingId,
                userId: USER_ID,
                propertyId: bb.propertyId,
                checkIn,
                checkOut,
                guests: 2,
                totalPrice: 150,
                priceBreakdown: [],
                status: 'COMPLETED'
            }
        });
    }

    console.log(`Seeded: ${allFeedback.length} feedback, ${bIdx - 1} bookings (${bareBookings.length} without feedback).`);
    console.log('Varna current=14 (3 neg), prev=8 (1 neg); Plovdiv current=5 (1 neg), prev=0.');
    await db.$disconnect();
}

main().catch(async e => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
});
