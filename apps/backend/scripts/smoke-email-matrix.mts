// Email matrix smoke probe — WHO receives each notification after role narrowing.
//
// The whole point of the epic's email decisions is a negative: admins must
// receive nothing operational. A negative is exactly what unit tests on the pure
// builders cannot prove, because they only assert what the builder returns for
// the recipients it was handed — not who the SERVICE decides to hand it.
//
// With no RESEND_API_KEY set, sendEmail logs `{to, subject}` instead of sending
// (email.service.ts). This probe wraps that logger to capture every dispatch, then
// drives the real service flows and asserts the recipient set for each event.
//
// Run: cd apps/backend && USE_OPENAI_MOCK=true pnpm exec tsx --env-file=.env scripts/smoke-email-matrix.mts

process.env.USE_OPENAI_MOCK = 'true';

const { db } = await import('../src/config/database.js');
const { logger } = await import('../src/utils/logger.js');
const { ticketsService } = await import('../src/routes/tickets/service/tickets.service.js');
const { bookingsService } = await import('../src/routes/bookings/service/bookings.service.js');
const { ticketRoutingService } = await import('../src/routes/ticket-routing/service/ticket-routing.service.js');

const EMAIL_PREFIX = 'mailmx-';
const PROP_TAG = 'MAILMX-smoke';

const fail = (msg: string): never => {
    throw new Error(`SMOKE FAIL: ${msg}`);
};

// ── Capture every [EMAIL] dispatch ──────────────────────────────
type Sent = { to: string; subject: string };
let sent: Sent[] = [];
const originalInfo = logger.info.bind(logger);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(logger as any).info = (obj: any, msg?: string) => {
    if (typeof msg === 'string' && msg.startsWith('[EMAIL]') && obj?.to) {
        sent.push({ to: obj.to, subject: obj.subject });
    }
    return originalInfo(obj, msg);
};

/** Emails are fire-and-forget; give the microtask queue a moment to flush. */
const settle = () => new Promise(r => setTimeout(r, 400));
const reset = () => {
    sent = [];
};

function assertRecipients(label: string, expected: string[], forbidden: string[]) {
    const got = [...new Set(sent.map(s => s.to))].sort();
    const want = [...new Set(expected)].sort();
    const leaked = got.filter(t => forbidden.includes(t));
    if (leaked.length > 0) fail(`${label}: leaked to forbidden recipient(s) ${leaked.join(', ')}`);
    if (JSON.stringify(got) !== JSON.stringify(want)) {
        fail(`${label}: expected [${want.join(', ')}], got [${got.join(', ')}]`);
    }
    console.log(`  ✓ ${label} → ${got.length ? got.join(', ') : '(nobody)'}`);
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const cleanup = async () => {
    await db.ticketMessage.deleteMany({ where: { ticket: { property: { title: PROP_TAG } } } });
    await db.ticket.deleteMany({ where: { property: { title: PROP_TAG } } });
    await db.booking.deleteMany({ where: { property: { title: PROP_TAG } } });
    await db.ticketCategoryAssignee.deleteMany({ where: { user: { email: { startsWith: EMAIL_PREFIX } } } });
    await db.property.deleteMany({ where: { title: PROP_TAG } });
    await db.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
};

const seedUser = (suffix: string, role: 'USER' | 'MANAGER' | 'ADMIN') =>
    db.user.create({
        data: {
            name: `MailMx ${suffix}`,
            email: `${EMAIL_PREFIX}${suffix}@test.local`,
            emailVerified: true,
            role
        }
    });

console.log('Email matrix smoke — who receives what after role narrowing\n');

await cleanup();
const preExistingRouting = await db.ticketCategoryAssignee.findMany({ select: { category: true, userId: true } });

try {
    const [guest, manager, admin1, admin2] = await Promise.all([
        seedUser('guest', 'USER'),
        seedUser('manager', 'MANAGER'),
        seedUser('admin1', 'ADMIN'),
        seedUser('admin2', 'ADMIN')
    ]);
    const ADMINS = [admin1.email, admin2.email];

    const property = await db.property.create({
        data: {
            title: PROP_TAG,
            description: 'smoke',
            type: 'APARTMENT',
            city: 'MailCity',
            address: 'x',
            nightlyPrice: 100,
            managerId: manager.id
        }
    });

    const mkBooking = (userId: string, status: 'PENDING' | 'ACTIVE') =>
        db.booking.create({
            data: {
                userId,
                propertyId: property.id,
                checkIn: new Date(ymd(plusDays(new Date(), status === 'ACTIVE' ? -2 : 20))),
                checkOut: new Date(ymd(plusDays(new Date(), status === 'ACTIVE' ? 5 : 25))),
                guests: 2,
                totalPrice: 500,
                // Must be an ARRAY of per-night entries — the booking response schema
                // rejects `{}`, and the failure surfaces as an opaque ZodError on read.
                priceBreakdown: [{ date: ymd(new Date()), price: 100, appliedRules: [] }],
                status
            }
        });

    // ── L-01 — a guest books: the property's manager only ───────
    reset();
    await bookingsService
        .create(
            { propertyId: property.id, checkIn: ymd(plusDays(new Date(), 40)), checkOut: ymd(plusDays(new Date(), 43)), guests: 2 } as never,
            guest.id
        )
        .catch(() => undefined); // pricing/availability may refuse; the dispatch is what matters
    await settle();
    assertRecipients('L-01 guest books → property manager only', [manager.email], ADMINS);

    // ── L-02 — the manager books their own property: nobody ─────
    reset();
    await bookingsService
        .create(
            { propertyId: property.id, checkIn: ymd(plusDays(new Date(), 60)), checkOut: ymd(plusDays(new Date(), 62)), guests: 2 } as never,
            manager.id
        )
        .catch(() => undefined);
    await settle();
    assertRecipients('L-02 manager books own property → nobody (actor skipped)', [], ADMINS);

    // ── L-03 — an admin books as a guest: manager, not the admin ─
    reset();
    await bookingsService
        .create(
            { propertyId: property.id, checkIn: ymd(plusDays(new Date(), 80)), checkOut: ymd(plusDays(new Date(), 82)), guests: 2 } as never,
            admin1.id
        )
        .catch(() => undefined);
    await settle();
    assertRecipients('L-03 admin books as guest → property manager only', [manager.email], ADMINS);

    // ── L-06 — ticket with no routing: property manager ─────────
    const activeBooking = await mkBooking(guest.id, 'ACTIVE');
    for (const c of ['NOISE', 'DAMAGE', 'CLEANLINESS', 'DELIVERY', 'UTILITIES', 'EMERGENCY'] as const) {
        await ticketRoutingService.updateCategory(c, [], { id: admin1.id, role: 'ADMIN' });
    }
    reset();
    const ticket = await ticketsService.create(guest.id, {
        propertyId: property.id,
        bookingId: activeBooking.id,
        text: 'no hot water'
    });
    await settle();
    assertRecipients('L-06 new ticket, no specialist → property manager', [manager.email], ADMINS);

    // ── L-07 — guest replies, assignee alive: the assignee ──────
    reset();
    await ticketsService.addMessage(guest.id, 'USER', ticket.id, 'any update?');
    await settle();
    assertRecipients('L-07 guest replies, assignee alive → assignee', [manager.email], ADMINS);

    // ── L-08 — guest replies, assignee soft-deleted → property manager
    //   The assignee IS the property manager here, so re-point the ticket at a
    //   throwaway manager and delete them, leaving the property manager as the
    //   only possible fallback.
    const ghost = await seedUser('ghost', 'MANAGER');
    await db.ticket.update({ where: { id: ticket.id }, data: { assignedToId: ghost.id } });
    await db.user.update({ where: { id: ghost.id }, data: { deletedAt: new Date() } });
    reset();
    await ticketsService.addMessage(guest.id, 'USER', ticket.id, 'still nothing?');
    await settle();
    assertRecipients('L-08 guest replies, assignee deleted → property manager', [manager.email], ADMINS);

    // ── L-09 — staff replies: the reporting guest ───────────────
    await db.ticket.update({ where: { id: ticket.id }, data: { assignedToId: manager.id } });
    reset();
    await ticketsService.addMessage(manager.id, 'MANAGER', ticket.id, 'engineer booked for tomorrow');
    await settle();
    assertRecipients('L-09 staff replies → reporting guest', [guest.email], ADMINS);

    // ── L-10 — booking confirmed: the guest ─────────────────────
    const pending = await mkBooking(guest.id, 'PENDING');
    reset();
    await bookingsService.confirm(pending.id, manager.id, 'MANAGER', true);
    await settle();
    assertRecipients('L-10 booking confirmed → guest', [guest.email], ADMINS);

    // ── L-13 — the global assertion ─────────────────────────────
    console.log('\n  ✓ L-13 no admin address appeared in any operational dispatch above');
    console.log('\n✓ All email-matrix smoke assertions passed');
} finally {
    (logger as unknown as { info: typeof originalInfo }).info = originalInfo;
    await cleanup();
    const byCategory = new Map<string, string[]>();
    for (const r of preExistingRouting) {
        byCategory.set(r.category, [...(byCategory.get(r.category) ?? []), r.userId]);
    }
    const restoreActor = { id: 'mailmx-restore', role: 'ADMIN' };
    for (const c of ['NOISE', 'DAMAGE', 'CLEANLINESS', 'DELIVERY', 'UTILITIES', 'EMERGENCY'] as const) {
        await ticketRoutingService.updateCategory(c, byCategory.get(c) ?? [], restoreActor);
    }
    console.log('  · cleaned up and restored routing config');
    await db.$disconnect();
}
