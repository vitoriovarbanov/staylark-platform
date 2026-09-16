/**
 * Dev seed: populate ALL booking statuses for testuser7@staylark.com so the
 * redesigned "My Bookings" stacked-section view can be checked end-to-end.
 *
 * Idempotent (deterministic UUIDs → upsert). Re-runnable.
 * Run from apps/backend:  pnpm exec tsx --env-file=.env prisma/seed-testuser7.ts
 *
 * Dates are relative to "today" so ACTIVE actually spans the current date,
 * CONFIRMED/PENDING are future, and COMPLETED/CANCELLED are in the past.
 */
import { PrismaClient, type BookingStatus, type CancellationReason } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = 'testuser7@staylark.com';

function buildUniformBreakdown(
    checkIn: string,
    nights: number,
    totalPrice: number
): { date: string; price: number; appliedRules: string[] }[] {
    const base = Math.round((totalPrice / nights) * 100) / 100;
    const remainder = Math.round((totalPrice - base * nights) * 100) / 100;
    const start = new Date(checkIn + 'T00:00:00Z');
    return Array.from({ length: nights }, (_, i) => {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + i);
        const price = i === nights - 1 ? Math.round((base + remainder) * 100) / 100 : base;
        return { date: date.toISOString().slice(0, 10), price, appliedRules: ['Seed'] };
    });
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
/** date offset from today (UTC midnight), as YYYY-MM-DD */
function dayFromToday(offset: number): string {
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + offset);
    return isoDate(d);
}

async function main() {
    const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
    if (!user) {
        throw new Error(
            `User ${USER_EMAIL} not found. Register/log in once via the app first so Better Auth creates the account.`
        );
    }

    const cities = ['Sofia', 'Bansko', 'Varna', 'Plovdiv'] as const;
    const propsByCity = new Map<string, { id: string; nightlyPrice: number }>();
    for (const city of cities) {
        const p = await prisma.property.findFirst({ where: { city }, select: { id: true, nightlyPrice: true } });
        if (!p) throw new Error(`Property for city "${city}" not found. Run the main seed (pnpm db:seed) first.`);
        propsByCity.set(city, { id: p.id, nightlyPrice: Number(p.nightlyPrice) });
    }

    type Spec = {
        seq: number;
        city: (typeof cities)[number];
        checkIn: string;
        checkOut: string;
        guests: number;
        status: BookingStatus;
        cancellationReason?: CancellationReason;
    };

    const nights = (ci: string, co: string) =>
        Math.round((new Date(co + 'T00:00:00Z').getTime() - new Date(ci + 'T00:00:00Z').getTime()) / 86400000);

    const specs: Spec[] = [
        // ── ACTIVE (spans today) → becomes the hero, excluded from sections ──
        { seq: 1, city: 'Bansko', checkIn: dayFromToday(-3), checkOut: dayFromToday(4), guests: 1, status: 'ACTIVE' },

        // ── Upcoming = CONFIRMED + PENDING (3 cards) ──
        {
            seq: 2,
            city: 'Sofia',
            checkIn: dayFromToday(12),
            checkOut: dayFromToday(17),
            guests: 2,
            status: 'CONFIRMED'
        },
        {
            seq: 3,
            city: 'Varna',
            checkIn: dayFromToday(32),
            checkOut: dayFromToday(38),
            guests: 4,
            status: 'CONFIRMED'
        },
        {
            seq: 4,
            city: 'Plovdiv',
            checkIn: dayFromToday(54),
            checkOut: dayFromToday(58),
            guests: 2,
            status: 'PENDING'
        },

        // ── Past = COMPLETED (4 → triggers "Show 1 more") ──
        {
            seq: 5,
            city: 'Sofia',
            checkIn: dayFromToday(-38),
            checkOut: dayFromToday(-33),
            guests: 2,
            status: 'COMPLETED'
        },
        {
            seq: 6,
            city: 'Varna',
            checkIn: dayFromToday(-59),
            checkOut: dayFromToday(-54),
            guests: 3,
            status: 'COMPLETED'
        },
        {
            seq: 7,
            city: 'Plovdiv',
            checkIn: dayFromToday(-99),
            checkOut: dayFromToday(-93),
            guests: 2,
            status: 'COMPLETED'
        },
        {
            seq: 8,
            city: 'Bansko',
            checkIn: dayFromToday(-130),
            checkOut: dayFromToday(-126),
            guests: 1,
            status: 'COMPLETED'
        },

        // ── Cancelled (2) ──
        {
            seq: 9,
            city: 'Sofia',
            checkIn: dayFromToday(-19),
            checkOut: dayFromToday(-15),
            guests: 2,
            status: 'CANCELLED',
            cancellationReason: 'MANUAL_GUEST'
        },
        {
            seq: 10,
            city: 'Varna',
            checkIn: dayFromToday(20),
            checkOut: dayFromToday(23),
            guests: 2,
            status: 'CANCELLED',
            cancellationReason: 'AUTO_EXPIRED_NO_CONFIRMATION'
        }
    ];

    for (const s of specs) {
        const prop = propsByCity.get(s.city)!;
        const n = nights(s.checkIn, s.checkOut);
        const totalPrice = Math.round(n * prop.nightlyPrice * 100) / 100;
        const id = `00000000-0000-4000-c007-${String(s.seq).padStart(12, '0')}`;
        await prisma.booking.upsert({
            where: { id },
            update: {
                userId: user.id,
                propertyId: prop.id,
                checkIn: new Date(s.checkIn),
                checkOut: new Date(s.checkOut),
                guests: s.guests,
                totalPrice,
                priceBreakdown: buildUniformBreakdown(s.checkIn, n, totalPrice),
                status: s.status,
                cancellationReason: s.cancellationReason ?? null
            },
            create: {
                id,
                userId: user.id,
                propertyId: prop.id,
                checkIn: new Date(s.checkIn),
                checkOut: new Date(s.checkOut),
                guests: s.guests,
                totalPrice,
                priceBreakdown: buildUniformBreakdown(s.checkIn, n, totalPrice),
                status: s.status,
                cancellationReason: s.cancellationReason ?? null
            }
        });
        console.log(`  ${s.status.padEnd(10)} ${s.city.padEnd(8)} ${s.checkIn} → ${s.checkOut}  €${totalPrice}`);
    }

    console.log(`\nSeeded ${specs.length} bookings for ${USER_EMAIL} (id ${user.id}).`);
    console.log('Hero = ACTIVE Bansko; Upcoming = 2 CONFIRMED + 1 PENDING; Past = 4 COMPLETED; Cancelled = 2.');
}

main()
    .catch(e => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
