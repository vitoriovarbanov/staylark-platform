// Specialist-ranking smoke probe — the I/O wiring behind chooseTicketAssignee.
//
// chooseTicketAssignee is unit-tested as a pure function. What is NOT covered
// there is the wrapper in tickets.service.ts that has to FEED it the two ranking
// signals: whether each handler manages a property in the ticket's city, and how
// many open tickets each currently holds. A bug in that gathering (wrong city,
// wrong status filter, counting the wrong column) would leave the pure tests
// green while every ticket still landed on one manager.
//
// This probe proves two volunteers on a category genuinely split work.
//
// MOCK ORDERING (critical):
//   mockIndex is module-level and starts at 0 in a fresh process, so the fixture
//   sequence is deterministic here: 0 NOISE, 1 DAMAGE, 2 CLEANLINESS, 3 DELIVERY,
//   4 UTILITIES, 5 EMERGENCY. Each create advances it by exactly one. Routing is
//   configured for the exact category each call emits, and every case asserts the
//   category it actually got, so a fixture change fails loudly rather than
//   silently testing the wrong thing.
//
// Run: cd apps/backend && USE_OPENAI_MOCK=true pnpm exec tsx --env-file=.env scripts/smoke-specialist-ranking.mts

process.env.USE_OPENAI_MOCK = 'true';

const { db } = await import('../src/config/database.js');
const { ticketsService } = await import('../src/routes/tickets/service/tickets.service.js');
const { ticketRoutingService } = await import('../src/routes/ticket-routing/service/ticket-routing.service.js');
const { isOpenAIMocked } = await import('../src/utils/openai.js');

const ADMIN_ACTOR = { id: 'smoke-rank-admin', role: 'ADMIN' };
const asAdmin = (category: Parameters<typeof ticketRoutingService.updateCategory>[0], userIds: string[]) =>
    ticketRoutingService.updateCategory(category, userIds, ADMIN_ACTOR);

const EMAIL_PREFIX = 'rank-smoke-';
const PROP_TAG = 'RANK-smoke';
const TICKET_CITY = 'RankCity';
const OTHER_CITY = 'FarCity';

const fail = (msg: string): never => {
    throw new Error(`SMOKE FAIL: ${msg}`);
};
function assertEq<T>(actual: T, expected: T, label: string): void {
    if (actual !== expected) fail(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const cleanup = async () => {
    await db.ticket.deleteMany({ where: { property: { title: PROP_TAG } } });
    await db.booking.deleteMany({ where: { property: { title: PROP_TAG } } });
    await db.ticketCategoryAssignee.deleteMany({ where: { user: { email: { startsWith: EMAIL_PREFIX } } } });
    await db.property.deleteMany({ where: { title: PROP_TAG } });
    await db.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
};

const seedManager = (suffix: string) =>
    db.user.create({
        data: {
            name: `Rank ${suffix}`,
            email: `${EMAIL_PREFIX}${suffix}-${Date.now()}@test.local`,
            emailVerified: true,
            role: 'MANAGER'
        }
    });

const seedProperty = (managerId: string | null, city: string) =>
    db.property.create({
        data: {
            title: PROP_TAG,
            description: 'smoke',
            type: 'APARTMENT',
            city,
            address: 'x',
            nightlyPrice: 100,
            managerId
        }
    });

const seedActiveBooking = (userId: string, propertyId: string) =>
    db.booking.create({
        data: {
            userId,
            propertyId,
            checkIn: new Date(ymd(plusDays(new Date(), -2))),
            checkOut: new Date(ymd(plusDays(new Date(), 5))),
            guests: 2,
            totalPrice: 700,
            priceBreakdown: {},
            status: 'ACTIVE'
        }
    });

/** Give a manager `n` OPEN tickets so their workload is a known quantity. */
async function seedLoad(assignedToId: string, propertyId: string, userId: string, bookingId: string, n: number) {
    for (let i = 0; i < n; i++) {
        await db.ticket.create({
            data: {
                userId,
                propertyId,
                bookingId,
                assignedToId,
                transcription: 'preexisting load',
                priority: 'LOW',
                status: 'OPEN',
                needsReview: false,
                needsAssignment: false
            }
        });
    }
}

const createTicket = (guestId: string, propertyId: string, bookingId: string) =>
    ticketsService.create(guestId, { propertyId, bookingId, text: 'smoke text ticket' });

console.log('Specialist-ranking smoke — same-city > fewest-open-tickets > id\n');
if (!isOpenAIMocked) fail('USE_OPENAI_MOCK must be true');

await cleanup();

// Snapshot real routing so the destructive updateCategory calls can be undone.
const preExisting = await db.ticketCategoryAssignee.findMany({ select: { category: true, userId: true } });

try {
    // ── Cast ────────────────────────────────────────────────────
    // owner    — manages the ticket's property; deliberately NOT a handler, so
    //            precedence rule 1 never fires and ranking is actually exercised.
    // local    — manages a property in the SAME city, heavily loaded.
    // far      — manages a property in another city, completely idle.
    // localIdle— same city as the ticket, idle. Used for the load tie-break.
    const [guest, owner, local, far, localIdle] = await Promise.all([
        db.user.create({
            data: {
                name: 'Rank guest',
                email: `${EMAIL_PREFIX}guest-${Date.now()}@test.local`,
                emailVerified: true,
                role: 'USER'
            }
        }),
        seedManager('owner'),
        seedManager('local'),
        seedManager('far'),
        seedManager('localidle')
    ]);

    const propTicket = await seedProperty(owner.id, TICKET_CITY); // where tickets are reported
    const propLocal = await seedProperty(local.id, TICKET_CITY); // puts `local` in the city
    const propLocalIdle = await seedProperty(localIdle.id, TICKET_CITY); // ditto for `localIdle`
    const propFar = await seedProperty(far.id, OTHER_CITY); // puts `far` out of the city
    void propLocal;
    void propLocalIdle;
    void propFar;

    const booking = await seedActiveBooking(guest.id, propTicket.id);

    // `local` carries 5 open tickets; `far` and `localIdle` carry none.
    await seedLoad(local.id, propTicket.id, guest.id, booking.id, 5);
    console.log('  · seeded: local=5 open, far=0 open, localIdle=0 open\n');

    // ── Case 1 — same city beats a lighter workload ─────────────
    //   NOISE → [local (same city, 5 open), far (other city, 0 open)].
    //   Load alone would pick `far`. City must win.
    // ──────────────────────────────────────────────────────────
    await asAdmin('NOISE', [local.id, far.id]);
    const t1 = await createTicket(guest.id, propTicket.id, booking.id);
    assertEq(t1.category, 'NOISE', 'case1 category');
    assertEq(t1.assignedToId, local.id, 'case1 assignedToId');
    console.log('  ✓ case 1: same-city handler wins over an idle out-of-city handler');

    // ── Case 2 — among same-city handlers, fewest open tickets ──
    //   DAMAGE → [local (6 open now — case 1 added one), localIdle (0 open)].
    //   Both in the city, so the tie-break must be workload.
    // ──────────────────────────────────────────────────────────
    await asAdmin('DAMAGE', [local.id, localIdle.id]);
    const t2 = await createTicket(guest.id, propTicket.id, booking.id);
    assertEq(t2.category, 'DAMAGE', 'case2 category');
    assertEq(t2.assignedToId, localIdle.id, 'case2 assignedToId');
    console.log('  ✓ case 2: among same-city handlers, the lighter workload wins');

    // ── Case 3 — the load signal is live, not cached ────────────
    //   CLEANLINESS → same pair. localIdle now holds 1 (from case 2), local 6.
    //   localIdle is still lighter, so it takes this one too — and that is the
    //   point: work accumulates on whoever is currently free, which is what
    //   "splitting the load" actually means.
    // ──────────────────────────────────────────────────────────
    await asAdmin('CLEANLINESS', [local.id, localIdle.id]);
    const t3 = await createTicket(guest.id, propTicket.id, booking.id);
    assertEq(t3.category, 'CLEANLINESS', 'case3 category');
    assertEq(t3.assignedToId, localIdle.id, 'case3 assignedToId');
    console.log('  ✓ case 3: ranking re-reads live workload on every ticket');

    // ── Case 4 — the two volunteers genuinely SPLIT the work ────
    //   The regression this whole probe exists for. Level the two same-city
    //   handlers, then issue several tickets in the same category and assert both
    //   received some. Under the old id-ascending tie-break, one manager took
    //   100% of them forever.
    // ──────────────────────────────────────────────────────────
    await db.ticket.deleteMany({ where: { property: { title: PROP_TAG } } }); // both back to 0 open

    // The mock rotates category per create, so the SAME pair is configured for each
    // of the next three fixtures. Which category lands is irrelevant — what matters
    // is that the same two volunteers are the candidates every time.
    const ROTATION = ['DELIVERY', 'UTILITIES', 'EMERGENCY'] as const;
    for (const category of ROTATION) await asAdmin(category, [local.id, localIdle.id]);

    const winners: string[] = [];
    for (const expected of ROTATION) {
        const t = await createTicket(guest.id, propTicket.id, booking.id);
        assertEq(t.category, expected, `case4 ${expected} category`);
        winners.push(t.assignedToId ?? '<unassigned>');
    }

    const localCount = winners.filter(w => w === local.id).length;
    const idleCount = winners.filter(w => w === localIdle.id).length;
    if (localCount === 0 || idleCount === 0) {
        fail(
            `case4: work did not split — local=${localCount}, localIdle=${idleCount}. ` +
                'Under id-ordering one manager takes everything; that is the bug this guards.'
        );
    }
    assertEq(localCount + idleCount, ROTATION.length, 'case4 total assigned');
    console.log(
        `  ✓ case 4: ${ROTATION.length} tickets split across both volunteers ` +
            `(local=${localCount}, localIdle=${idleCount}) — never all to one`
    );

    console.log('\n✓ All specialist-ranking smoke assertions passed');
} finally {
    await cleanup();
    // Restore the real routing config the probe overwrote.
    const byCategory = new Map<string, string[]>();
    for (const row of preExisting) {
        byCategory.set(row.category, [...(byCategory.get(row.category) ?? []), row.userId]);
    }
    for (const category of ['NOISE', 'DAMAGE', 'CLEANLINESS', 'DELIVERY', 'UTILITIES', 'EMERGENCY'] as const) {
        await asAdmin(category, byCategory.get(category) ?? []);
    }
    console.log('  · restored pre-existing routing config');
    await db.$disconnect();
}
