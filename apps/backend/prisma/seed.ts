import { PrismaClient } from '@prisma/client';
import { TICKET_STATUSES_TERMINAL } from '@staylark/contract';
import { DEMO_PHOTOS } from './seed-photos.js';

const prisma = new PrismaClient();

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
        return {
            date: date.toISOString().slice(0, 10),
            price,
            appliedRules: ['Legacy']
        };
    });
}

// Deterministic UUIDs for idempotent upserts
const IDS = {
    users: {
        guest: '00000000-0000-4000-a000-000000000001',
        manager: '00000000-0000-4000-a000-000000000002',
        admin: '00000000-0000-4000-a000-000000000003'
    },
    properties: {
        sofiaApartment: '00000000-0000-4000-b000-000000000001',
        zermattHotel: '00000000-0000-4000-b000-000000000002',
        lagosHouse: '00000000-0000-4000-b000-000000000003',
        tuscanyApartment: '00000000-0000-4000-b000-000000000004'
    },
    bookings: {
        confirmed: '00000000-0000-4000-c000-000000000001',
        active: '00000000-0000-4000-c000-000000000002',
        completed: '00000000-0000-4000-c000-000000000003',
        pending: '00000000-0000-4000-c000-000000000004'
    },
    feedback: {
        positive: '00000000-0000-4000-d000-000000000001',
        neutral: '00000000-0000-4000-d000-000000000002'
    },
    tickets: {
        openHigh: '00000000-0000-4000-e000-000000000001',
        inProgressMedium: '00000000-0000-4000-e000-000000000002'
    },
    pricingRules: {
        month1: '00000000-0000-4000-f000-000000000001',
        month3: '00000000-0000-4000-f000-000000000002',
        month6: '00000000-0000-4000-f000-000000000003',
        month12: '00000000-0000-4000-f000-000000000004'
    }
} as const;

async function main() {
    console.log('Seeding database...');

    // ─── Users ──────────────────────────────────────────────────
    const guest = await prisma.user.upsert({
        where: { id: IDS.users.guest },
        update: {},
        create: {
            id: IDS.users.guest,
            name: 'Guest User',
            email: 'guest-dev@staylark.com',
            emailVerified: false,
            role: 'USER',
            subscriptionTier: 'BASIC',
            phone: '+359888111111'
        }
    });

    const manager = await prisma.user.upsert({
        where: { id: IDS.users.manager },
        update: {},
        create: {
            id: IDS.users.manager,
            name: 'Property Manager',
            email: 'manager-dev@staylark.com',
            emailVerified: true,
            role: 'MANAGER'
        }
    });

    const admin = await prisma.user.upsert({
        where: { id: IDS.users.admin },
        update: {},
        create: {
            id: IDS.users.admin,
            name: 'Admin User',
            email: 'admin-dev@staylark.com',
            emailVerified: true,
            role: 'ADMIN'
        }
    });

    console.log(`  Users: ${guest.email}, ${manager.email}, ${admin.email}`);

    // ─── Properties ─────────────────────────────────────────────
    // One stay per country, one per setting (city, mountain, coast, countryside). Catalogue fields are applied on `update` too, so re-seeding
    // an older database moves its rows onto this set in place (IDs, bookings, tickets
    // and quotes stay attached). Photos are create-only: the boot sweep has already
    // copied existing ones into the environment's own Cloudinary account.
    const properties = [
        {
            id: IDS.properties.sofiaApartment,
            title: 'Modern Sofia Apartment',
            description: 'A stylish 2-bedroom apartment in the heart of Sofia with city views.',
            type: 'APARTMENT',
            city: 'Sofia',
            address: 'ul. Vitosha 42, Sofia 1000, Bulgaria',
            nightlyPrice: 85.0,
            amenities: ['wifi', 'kitchen', 'parking', 'air-conditioning'],
            photos: DEMO_PHOTOS.sofiaApartment
        },
        {
            id: IDS.properties.zermattHotel,
            title: 'Zermatt Alpine Hotel',
            description:
                'Wood-panelled hotel room at the foot of the ski slopes, with a balcony facing the Matterhorn and a sauna for after a day on the mountain.',
            type: 'HOTEL',
            city: 'Zermatt',
            address: 'Bahnhofstrasse 41, 3920 Zermatt, Switzerland',
            nightlyPrice: 180.0,
            amenities: ['wifi', 'breakfast', 'sauna', 'ski-storage', 'balcony'],
            photos: DEMO_PHOTOS.zermattHotel
        },
        {
            id: IDS.properties.lagosHouse,
            title: 'Lagos Beach House',
            description:
                'Whitewashed three-bedroom house a short walk from Praia Dona Ana, with a roof terrace for sunsets over the Atlantic coast.',
            type: 'HOUSE',
            city: 'Lagos',
            address: 'Rua da Praia 12, 8600-315 Lagos, Portugal',
            nightlyPrice: 160.0,
            amenities: ['wifi', 'kitchen', 'terrace', 'beach-access', 'air-conditioning'],
            photos: DEMO_PHOTOS.lagosHouse
        },
        {
            id: IDS.properties.tuscanyApartment,
            title: 'Tuscan Vineyard Apartment',
            description:
                'Stone apartment on a family farm among the vineyards below Montepulciano, with a shared pool and wine from the estate.',
            type: 'APARTMENT',
            city: 'Montepulciano',
            address: 'Via di Nottola 7, 53045 Montepulciano, Italy',
            nightlyPrice: 95.0,
            amenities: ['wifi', 'kitchen', 'pool', 'garden', 'parking'],
            photos: DEMO_PHOTOS.tuscanyApartment
        }
    ] as const;

    for (const { id, photos, ...catalogue } of properties) {
        const data = {
            ...catalogue,
            amenities: [...catalogue.amenities],
            minNightlyPrice: null,
            maxNightlyPrice: null
        };
        await prisma.property.upsert({
            where: { id },
            update: data,
            create: { id, ...data, photos: [...photos] }
        });
    }

    console.log(`  Properties: ${properties.map(p => p.title).join(', ')}`);

    // ─── Bookings ───────────────────────────────────────────────
    // Future confirmed booking
    const confirmedBooking = await prisma.booking.upsert({
        where: { id: IDS.bookings.confirmed },
        update: {},
        create: {
            id: IDS.bookings.confirmed,
            userId: IDS.users.guest,
            propertyId: IDS.properties.sofiaApartment,
            checkIn: new Date('2026-05-01'),
            checkOut: new Date('2026-05-05'),
            guests: 2,
            totalPrice: 340.0,
            priceBreakdown: buildUniformBreakdown('2026-05-01', 4, 340.0),
            status: 'CONFIRMED'
        }
    });

    // Current active booking
    const activeBooking = await prisma.booking.upsert({
        where: { id: IDS.bookings.active },
        update: {},
        create: {
            id: IDS.bookings.active,
            userId: IDS.users.guest,
            propertyId: IDS.properties.zermattHotel,
            checkIn: new Date('2026-03-15'),
            checkOut: new Date('2026-03-20'),
            guests: 1,
            totalPrice: 900.0,
            priceBreakdown: buildUniformBreakdown('2026-03-15', 5, 900.0),
            status: 'ACTIVE'
        }
    });

    // Past completed booking
    const completedBooking = await prisma.booking.upsert({
        where: { id: IDS.bookings.completed },
        update: {},
        create: {
            id: IDS.bookings.completed,
            userId: IDS.users.guest,
            propertyId: IDS.properties.lagosHouse,
            checkIn: new Date('2026-01-10'),
            checkOut: new Date('2026-01-15'),
            guests: 4,
            totalPrice: 800.0,
            priceBreakdown: buildUniformBreakdown('2026-01-10', 5, 800.0),
            status: 'COMPLETED'
        }
    });

    // Future pending booking
    const pendingBooking = await prisma.booking.upsert({
        where: { id: IDS.bookings.pending },
        update: {},
        create: {
            id: IDS.bookings.pending,
            userId: IDS.users.guest,
            propertyId: IDS.properties.tuscanyApartment,
            checkIn: new Date('2026-06-01'),
            checkOut: new Date('2026-06-04'),
            guests: 2,
            totalPrice: 285.0,
            priceBreakdown: buildUniformBreakdown('2026-06-01', 3, 285.0),
            status: 'PENDING'
        }
    });

    console.log(
        `  Bookings: ${confirmedBooking.status}, ${activeBooking.status}, ${completedBooking.status}, ${pendingBooking.status}`
    );

    // ─── Feedback ───────────────────────────────────────────────
    const positiveFeedback = await prisma.feedback.upsert({
        where: { id: IDS.feedback.positive },
        update: {},
        create: {
            id: IDS.feedback.positive,
            userId: IDS.users.guest,
            propertyId: IDS.properties.lagosHouse,
            bookingId: IDS.bookings.completed,
            sentiment: 'POSITIVE',
            score: 5,
            summary: 'Excellent stay with amazing sea views and a wonderful garden.',
            topics: ['cleanliness', 'location', 'amenities']
        }
    });

    const neutralFeedback = await prisma.feedback.upsert({
        where: { id: IDS.feedback.neutral },
        update: {},
        create: {
            id: IDS.feedback.neutral,
            userId: IDS.users.guest,
            propertyId: IDS.properties.sofiaApartment,
            bookingId: IDS.bookings.confirmed,
            sentiment: 'NEUTRAL',
            score: 3,
            summary: 'Decent apartment but the noise from the street was noticeable.',
            topics: ['noise', 'location']
        }
    });

    console.log(`  Feedback: ${positiveFeedback.sentiment}, ${neutralFeedback.sentiment}`);

    // ─── Tickets ────────────────────────────────────────────────
    const openTicket = await prisma.ticket.upsert({
        where: { id: IDS.tickets.openHigh },
        update: {},
        create: {
            id: IDS.tickets.openHigh,
            userId: IDS.users.guest,
            propertyId: IDS.properties.zermattHotel,
            bookingId: IDS.bookings.active,
            priority: 'HIGH',
            status: 'OPEN',
            category: 'UTILITIES',
            needsAssignment: true,
            summary: 'Heating not working properly in the room during cold weather.'
        }
    });

    const inProgressTicket = await prisma.ticket.upsert({
        where: { id: IDS.tickets.inProgressMedium },
        update: {},
        create: {
            id: IDS.tickets.inProgressMedium,
            userId: IDS.users.guest,
            propertyId: IDS.properties.lagosHouse,
            bookingId: IDS.bookings.completed,
            assignedToId: IDS.users.manager,
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            category: 'CLEANLINESS',
            summary: 'Kitchen appliances need deep cleaning.'
        }
    });

    console.log(
        `  Tickets: ${openTicket.status}/${openTicket.priority}, ${inProgressTicket.status}/${inProgressTicket.priority}`
    );

    // ─── Dashboard demo data (ADMIN-002 KPI review) ─────────────
    // Generates bookings across the trailing 6 months (relative to today) so the
    // admin dashboard's occupancy chart, stat cards, and critical-tickets table
    // have meaningful content. All rows use deterministic IDs → idempotent.
    type DemoStatus = 'COMPLETED' | 'CONFIRMED' | 'ACTIVE';

    const propertyList = [
        { id: IDS.properties.sofiaApartment, price: 85 },
        { id: IDS.properties.zermattHotel, price: 180 },
        { id: IDS.properties.lagosHouse, price: 160 },
        { id: IDS.properties.tuscanyApartment, price: 95 }
    ];

    // Extra guests so the dashboard shows varied names and a non-trivial user count.
    const demoUsers = [
        { id: '00000000-0000-4000-a001-000000000001', name: 'Elena Petrova' },
        { id: '00000000-0000-4000-a001-000000000002', name: 'Martin Kovac' },
        { id: '00000000-0000-4000-a001-000000000003', name: 'Sofia Dimitrova' },
        { id: '00000000-0000-4000-a001-000000000004', name: 'Lukas Novak' }
    ];
    for (let i = 0; i < demoUsers.length; i++) {
        await prisma.user.upsert({
            where: { id: demoUsers[i].id },
            update: {},
            create: {
                id: demoUsers[i].id,
                name: demoUsers[i].name,
                email: `demo${i + 1}-dev@staylark.com`,
                emailVerified: true,
                role: 'USER',
                subscriptionTier: 'BASIC'
            }
        });
    }

    const now = new Date();
    const Y = now.getUTCFullYear();
    const Mo = now.getUTCMonth();
    const todayDate = now.getUTCDate();
    const daysInMonth = (year: number, monthIdx: number) => new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const isoDate = (d: Date) => d.toISOString().slice(0, 10);

    // Backdate property creation so historical-month occupancy has a non-zero
    // denominator. Occupancy availability counts only properties that existed in a
    // given month (createdAt < month_end); freshly-seeded properties would otherwise
    // share "now" as createdAt and zero out every past month on the chart.
    await prisma.property.updateMany({
        where: { id: { in: propertyList.map(p => p.id) } },
        data: { createdAt: new Date(Date.UTC(Y, Mo - 7, 1)) }
    });

    let demoSeq = 0;
    const bookingsByProperty: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [] };

    const makeBooking = async (opts: {
        propertyIdx: number;
        userId: string;
        checkIn: Date;
        nights: number;
        status: DemoStatus;
    }): Promise<string> => {
        const property = propertyList[opts.propertyIdx];
        const checkOut = new Date(opts.checkIn);
        checkOut.setUTCDate(opts.checkIn.getUTCDate() + opts.nights);
        const totalPrice = Math.round(opts.nights * property.price * 100) / 100;
        const id = `00000000-0000-4000-c001-${String(++demoSeq).padStart(12, '0')}`;
        await prisma.booking.upsert({
            where: { id },
            update: {},
            create: {
                id,
                userId: opts.userId,
                propertyId: property.id,
                checkIn: opts.checkIn,
                checkOut,
                guests: 2,
                totalPrice,
                priceBreakdown: buildUniformBreakdown(isoDate(opts.checkIn), opts.nights, totalPrice),
                status: opts.status
            }
        });
        bookingsByProperty[opts.propertyIdx].push(id);
        return id;
    };

    // Past 5 months → COMPLETED bookings, varied nights for an up/down occupancy trend.
    const baseNights = [6, 13, 9, 15, 11]; // index 0 = 5 months ago … 4 = last month
    for (let k = 0; k < 5; k++) {
        const offset = 5 - k;
        const monthDate = new Date(Date.UTC(Y, Mo - offset, 1));
        const yy = monthDate.getUTCFullYear();
        const mIdx = monthDate.getUTCMonth();
        const days = daysInMonth(yy, mIdx);
        for (let p = 0; p < 4; p++) {
            const startDay = 2 + p * 2;
            let nights = baseNights[k] + p;
            if (startDay + nights > days) nights = Math.max(2, days - startDay - 1);
            await makeBooking({
                propertyIdx: p,
                userId: demoUsers[p].id,
                checkIn: new Date(Date.UTC(yy, mIdx, startDay)),
                nights,
                status: 'COMPLETED'
            });
        }
    }

    // Current month → 1 ACTIVE (spans today) + 3 CONFIRMED (future) so occupancy and
    // the active-bookings card are populated.
    const curDays = daysInMonth(Y, Mo);
    await makeBooking({
        propertyIdx: 0,
        userId: demoUsers[0].id,
        checkIn: new Date(Date.UTC(Y, Mo, Math.max(1, todayDate - 1))),
        nights: 6,
        status: 'ACTIVE'
    });
    const futurePlan = [
        { p: 1, addDays: 8, nights: 7, u: 1 },
        { p: 2, addDays: 3, nights: 10, u: 2 },
        { p: 3, addDays: 5, nights: 7, u: 3 }
    ];
    for (const f of futurePlan) {
        await makeBooking({
            propertyIdx: f.p,
            userId: demoUsers[f.u].id,
            checkIn: new Date(Date.UTC(Y, Mo, Math.min(curDays - 1, todayDate + f.addDays))),
            nights: f.nights,
            status: 'CONFIRMED'
        });
    }

    // Several CRITICAL/HIGH unresolved tickets so the critical-tickets table is full.
    // The final DELIVERY entry is intentionally DISMISSED — it should NOT surface in
    // the critical-tickets table (terminal status), backing the dismissed-status QA.
    const demoTickets = [
        {
            p: 0,
            priority: 'CRITICAL',
            status: 'OPEN',
            category: 'EMERGENCY',
            summary: 'Gas smell reported — guests evacuated the apartment.'
        },
        {
            p: 2,
            priority: 'CRITICAL',
            status: 'IN_PROGRESS',
            category: 'DAMAGE',
            summary: 'Burst pipe flooded the ground-floor bathroom.'
        },
        { p: 1, priority: 'HIGH', status: 'OPEN', category: 'UTILITIES', summary: 'No hot water since this morning.' },
        {
            p: 3,
            priority: 'HIGH',
            status: 'OPEN',
            category: 'NOISE',
            summary: 'Persistent construction noise from the neighbouring unit.'
        },
        {
            p: 0,
            priority: 'CRITICAL',
            status: 'OPEN',
            category: 'DAMAGE',
            summary: 'Broken front-door lock — unit cannot be secured.'
        },
        {
            p: 2,
            priority: 'HIGH',
            status: 'DISMISSED',
            category: 'DELIVERY',
            summary: 'Replacement mattress delayed for over a week.'
        }
    ] as const;
    let ticketSeq = 0;
    for (const t of demoTickets) {
        const id = `00000000-0000-4000-e001-${String(++ticketSeq).padStart(12, '0')}`;
        await prisma.ticket.upsert({
            where: { id },
            update: {},
            create: {
                id,
                userId: demoUsers[t.p].id,
                propertyId: propertyList[t.p].id,
                bookingId: bookingsByProperty[t.p][0],
                priority: t.priority,
                status: t.status,
                category: t.category,
                // Terminal tickets are closed and never need triage; everything else does.
                needsAssignment: !(TICKET_STATUSES_TERMINAL as readonly string[]).includes(t.status),
                summary: t.summary
            }
        });
    }

    console.log(
        `  Dashboard demo: +${demoSeq} bookings, +${demoUsers.length} users, +${demoTickets.length} critical/high tickets`
    );

    // ─── Pricing rules: default long-stay (monthly) discount tiers ──────
    // Global (propertyId: null), always-on DURATION_DISCOUNT rules so monthly
    // stays show savings out of the box. minNights is set below the nominal
    // month-night count so a stay always qualifies for its tier. Validity
    // window is wide because selection requires startDate <= checkIn AND
    // endDate >= checkOut.
    const ALWAYS_ON_START = new Date('2020-01-01T00:00:00Z');
    const ALWAYS_ON_END = new Date('2099-12-31T00:00:00Z');

    const MONTHLY_TIERS = [
        { id: IDS.pricingRules.month1, name: '1+ month stay', minNights: 28, multiplier: 0.95 },
        { id: IDS.pricingRules.month3, name: '3+ month stay', minNights: 89, multiplier: 0.9 },
        { id: IDS.pricingRules.month6, name: '6+ month stay', minNights: 181, multiplier: 0.85 },
        { id: IDS.pricingRules.month12, name: '12 month stay', minNights: 365, multiplier: 0.8 }
    ] as const;

    for (const tier of MONTHLY_TIERS) {
        await prisma.pricingRule.upsert({
            where: { id: tier.id },
            update: {
                name: tier.name,
                type: 'DURATION_DISCOUNT',
                multiplier: tier.multiplier,
                minNights: tier.minNights,
                startDate: ALWAYS_ON_START,
                endDate: ALWAYS_ON_END,
                isActive: true,
                propertyId: null
            },
            create: {
                id: tier.id,
                name: tier.name,
                type: 'DURATION_DISCOUNT',
                multiplier: tier.multiplier,
                minNights: tier.minNights,
                startDate: ALWAYS_ON_START,
                endDate: ALWAYS_ON_END,
                isActive: true,
                propertyId: null
            }
        });
    }

    console.log(`  Pricing rules: ${MONTHLY_TIERS.length} monthly discount tiers`);

    console.log('Seed completed successfully!');
}

main()
    .catch(e => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
