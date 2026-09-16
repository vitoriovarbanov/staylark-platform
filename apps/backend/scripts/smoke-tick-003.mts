// TICK-003 smoke probe — ticket-routing → assignment resolution + manager scoping.
//
// Drives the service/repository layer directly (no HTTP). Runs in OpenAI-mock mode
// so `ticketsService.create` skips Whisper/GPT and returns the deterministic
// MOCK_TICKET_RESPONSES fixtures (a module-level round-robin in tickets.service.ts).
//
// MOCK ORDERING (critical):
//   Each `create` call advances mockIndex by exactly 1 and pulls the next fixture.
//   The fixture sequence (index 0..6) is:
//     0 NOISE, 1 DAMAGE, 2 CLEANLINESS, 3 DELIVERY, 4 UTILITIES, 5 EMERGENCY,
//     6 INTERNET (invalid category → fails Zod → category=null, needsReview=true)
//   This script issues exactly 7 create calls, in order, and asserts each yields
//   the expected category. Routing is configured for the EXACT category each call
//   emits, so assignment behaviour is fully deterministic. After this point the
//   index has wrapped; we make no assumptions about other concurrent runs because
//   every assertion checks the category we actually got back.
//
// Run: cd apps/backend && USE_OPENAI_MOCK=true pnpm exec tsx --env-file=.env scripts/smoke-tick-003.mts

// Ensure the mock is active even if the env var wasn't passed on the CLI.
process.env.USE_OPENAI_MOCK = 'true';

// Routing setup in this probe is admin-level config (it assigns OTHER managers),
// so every updateCategory call here runs as an ADMIN actor. Manager self-service
// is covered by the assertSelfOnlyRoutingChange unit tests.
const ADMIN_ACTOR = { id: 'smoke-admin-actor', role: 'ADMIN' };

const { db } = await import('../src/config/database.js');
const { ticketsService } = await import('../src/routes/tickets/service/tickets.service.js');
const { ticketRoutingService } = await import('../src/routes/ticket-routing/service/ticket-routing.service.js');
const { ticketRoutingRepository } = await import(
    '../src/routes/ticket-routing/repository/ticket-routing.repository.js'
);
const { isOpenAIMocked } = await import('../src/utils/openai.js');

/** Routing setup helper — always acts as an ADMIN, since it configures other managers. */
const asAdmin = (category: Parameters<typeof ticketRoutingService.updateCategory>[0], userIds: string[]) =>
    ticketRoutingService.updateCategory(category, userIds, ADMIN_ACTOR);

const EMAIL_PREFIX = 'tick003-smoke-';
const PROP_TAG = 'TICK-003-smoke';

const fail = (msg: string): never => {
    throw new Error(`SMOKE FAIL: ${msg}`);
};

function assertPresent<T>(value: T, msg: string): asserts value is NonNullable<T> {
    if (value == null) fail(msg);
}

function assertEq<T>(actual: T, expected: T, label: string): void {
    if (actual !== expected) fail(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

// DATE-friendly helpers (booking dates are DATE, not TIMESTAMP).
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const cleanup = async () => {
    // Delete in FK-safe order: tickets → bookings → category-assignees → properties → users.
    await db.ticket.deleteMany({ where: { property: { title: PROP_TAG } } });
    await db.booking.deleteMany({ where: { property: { title: PROP_TAG } } });
    await db.ticketCategoryAssignee.deleteMany({
        where: { user: { email: { startsWith: EMAIL_PREFIX } } }
    });
    await db.property.deleteMany({ where: { title: PROP_TAG } });
    await db.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
};

async function seedUser(suffix: string, role: 'USER' | 'MANAGER' | 'ADMIN') {
    return db.user.create({
        data: {
            name: `Smoke ${suffix}`,
            email: `${EMAIL_PREFIX}${suffix}-${Date.now()}@test.local`,
            emailVerified: true,
            role
        }
    });
}

async function seedProperty(managerId: string | null) {
    return db.property.create({
        data: {
            title: PROP_TAG,
            description: 'smoke',
            type: 'APARTMENT',
            city: 'Sofia',
            address: 'x',
            nightlyPrice: 100,
            managerId
        }
    });
}

async function seedActiveBooking(userId: string, propertyId: string) {
    const today = new Date();
    const ci = plusDays(today, -2);
    const co = plusDays(today, 5);
    return db.booking.create({
        data: {
            userId,
            propertyId,
            checkIn: new Date(ymd(ci)),
            checkOut: new Date(ymd(co)),
            guests: 2,
            totalPrice: 700,
            priceBreakdown: {},
            status: 'ACTIVE'
        }
    });
}

/** Create a ticket via the real service (text path → no audio). Returns the serialized ticket. */
async function createTicket(guestId: string, propertyId: string, bookingId: string) {
    return ticketsService.create(guestId, {
        propertyId,
        bookingId,
        text: 'smoke text ticket'
    });
}

console.log('TICK-003 smoke — assignment resolution + scoping\n');

if (!isOpenAIMocked) fail('USE_OPENAI_MOCK must be true — run with USE_OPENAI_MOCK=true');
console.log('  · OpenAI mock active\n');

await cleanup();

// SNAPSHOT the real category-routing config before the destructive updateCategory()
// calls below. updateCategory() REPLACES a whole category's assignees globally (there
// is one routing config per category, not per-tenant), so running this smoke against
// the shared dev DB would otherwise wipe an operator's saved mappings. The snapshot is
// taken after the start cleanup, so it contains only real (non-smoke) rows; it is
// restored in the finally block.
const routingSnapshot = await db.ticketCategoryAssignee.findMany({
    select: { category: true, userId: true }
});

try {
    // ── Seed staff + guest ────────────────────────────────────
    const managerA = await seedUser('mgrA', 'MANAGER');
    const managerB = await seedUser('mgrB', 'MANAGER'); // second pool member for case 10
    const managerC = await seedUser('mgrC', 'MANAGER');
    const guest = await seedUser('guest', 'USER');
    // A manager who will be mapped to a category, then downgraded to USER (case 9).
    const managerD = await seedUser('mgrD', 'MANAGER');
    // An ADMIN used to re-fetch a ticket via the service in case 11.
    const adminE = await seedUser('admE', 'ADMIN');
    console.log(
        `  · seeded managerA=${managerA.id} managerB=${managerB.id} managerC=${managerC.id} guest=${guest.id} managerD=${managerD.id} adminE=${adminE.id}\n`
    );

    // ── Seed properties ───────────────────────────────────────
    const propA = await seedProperty(managerA.id); // managed by A
    const propB = await seedProperty(managerB.id); // managed by B (case 10)
    const propC = await seedProperty(managerC.id); // managed by C
    const propNoMgr = await seedProperty(null); // no manager

    // ── Seed ACTIVE bookings (one per (guest, property) we report against) ──
    const bookingA = await seedActiveBooking(guest.id, propA.id);
    const bookingB = await seedActiveBooking(guest.id, propB.id);
    const bookingC = await seedActiveBooking(guest.id, propC.id);
    const bookingNoMgr = await seedActiveBooking(guest.id, propNoMgr.id);

    // ── Configure routing BEFORE any role downgrade (updateCategory validates roles) ──
    // Sequence consumed by the 7 create calls below: NOISE, DAMAGE, CLEANLINESS,
    // DELIVERY, UTILITIES, EMERGENCY, INTERNET(null).
    await asAdmin('NOISE', [managerA.id]); // case 1: A handles NOISE
    await asAdmin('DAMAGE', [managerA.id]); // case 2: A handles DAMAGE (prop managed by C)
    await asAdmin('CLEANLINESS', [managerA.id]); // case 3: A handles, prop has no manager
    await asAdmin('DELIVERY', []); // case 4: empty list
    // EMERGENCY mapped to managerD — used by the role-downgrade case (9).
    await asAdmin('EMERGENCY', [managerD.id]);
    console.log('  · routing configured (NOISE→A, DAMAGE→A, CLEANLINESS→A, DELIVERY→[], EMERGENCY→D)\n');

    // ──────────────────────────────────────────────────────────
    // Case 1 — NOISE (fixture 0): routed to A, property managed by A → auto-assign A.
    // ──────────────────────────────────────────────────────────
    const t1 = await createTicket(guest.id, propA.id, bookingA.id);
    assertEq(t1.category, 'NOISE', 'case1 category');
    assertEq(t1.assignedToId, managerA.id, 'case1 assignedToId');
    assertEq(t1.needsAssignment, false, 'case1 needsAssignment');
    console.log('  ✓ case 1: NOISE on A-managed property → auto-assigned to Manager A, needsAssignment=false');

    // ──────────────────────────────────────────────────────────
    // Case 2 — DAMAGE (fixture 1): routed to A, property managed by C → SPECIALIST routing.
    //   The property's manager wins only when they are themselves a designated handler.
    //   C is not, so the category's handler (A) takes it. Previously this fell to the
    //   admin triage queue, which no longer exists.
    // ──────────────────────────────────────────────────────────
    const t2 = await createTicket(guest.id, propC.id, bookingC.id);
    assertEq(t2.category, 'DAMAGE', 'case2 category');
    assertEq(t2.assignedToId, managerA.id, 'case2 assignedToId');
    assertEq(t2.needsAssignment, false, 'case2 needsAssignment');
    console.log('  ✓ case 2: DAMAGE routed to A, property managed by C → specialist A (not triage)');

    // ──────────────────────────────────────────────────────────
    // Case 3 — CLEANLINESS (fixture 2): routed to A, property has NO manager.
    //   Routing still resolves: with no property manager to prefer, the category's
    //   designated handler takes it. Only a property with neither a manager nor an
    //   applicable handler can now yield an unassigned ticket.
    // ──────────────────────────────────────────────────────────
    const t3 = await createTicket(guest.id, propNoMgr.id, bookingNoMgr.id);
    assertEq(t3.category, 'CLEANLINESS', 'case3 category');
    assertEq(t3.assignedToId, managerA.id, 'case3 assignedToId');
    assertEq(t3.needsAssignment, false, 'case3 needsAssignment');
    console.log('  ✓ case 3: CLEANLINESS on unmanaged property → routed to handler A');

    // ──────────────────────────────────────────────────────────
    // Case 4 — DELIVERY (fixture 3): category mapped to an EMPTY list.
    //   THE fallback case. With no handler for the category, the property's own
    //   manager takes it. This is what replaced the admin triage queue, and it is
    //   why no ticket can be stranded: every property has a live manager.
    // ──────────────────────────────────────────────────────────
    const t4 = await createTicket(guest.id, propA.id, bookingA.id);
    assertEq(t4.category, 'DELIVERY', 'case4 category');
    assertEq(t4.assignedToId, managerA.id, 'case4 assignedToId');
    assertEq(t4.needsAssignment, false, 'case4 needsAssignment');
    console.log('  ✓ case 4: DELIVERY with no handlers → fell back to property manager A');

    // ──────────────────────────────────────────────────────────
    // Two throwaway creates to advance the mock to the needsReview fixture.
    //   fixture 4 = UTILITIES, fixture 5 = EMERGENCY. We assert categories to prove
    //   the deterministic ordering holds (and so the next call is the INTERNET fixture).
    // ──────────────────────────────────────────────────────────
    const t5 = await createTicket(guest.id, propA.id, bookingA.id); // UTILITIES
    assertEq(t5.category, 'UTILITIES', 'utilities-advance category');
    const t6 = await createTicket(guest.id, propA.id, bookingA.id); // EMERGENCY
    assertEq(t6.category, 'EMERGENCY', 'emergency-advance category');
    console.log('  · advanced mock through UTILITIES, EMERGENCY (ordering confirmed)');

    // ──────────────────────────────────────────────────────────
    // Case 5 — INTERNET (fixture 6): invalid category → Zod fallback → category null,
    //   needsReview=true. With no category there is no routing to consult, so the
    //   property's manager takes it. An unclassified ticket still reaches a human,
    //   which is the whole point of the fallback replacing admin triage.
    // ──────────────────────────────────────────────────────────
    const t7 = await createTicket(guest.id, propA.id, bookingA.id);
    assertEq(t7.category, null, 'case5 category');
    assertEq(t7.needsReview, true, 'case5 needsReview');
    assertEq(t7.assignedToId, managerA.id, 'case5 assignedToId');
    assertEq(t7.needsAssignment, false, 'case5 needsAssignment');
    console.log('  ✓ case 5: unclassified ticket → needsReview=true, still assigned to property manager A');

    // ──────────────────────────────────────────────────────────
    // Case 6 — Scoping: reassign t2 (on propC) to Manager C, then confirm
    //   ticketsService.list(C, 'MANAGER', …) includes it. (C DOES manage propC,
    //   but more importantly assignment alone must surface a ticket — verified harder
    //   in case 7 by assigning C to a property C does NOT manage.)
    //
    //   To exercise the assigned-but-not-managing path precisely, reassign t4
    //   (on propA, which C does NOT manage) to Manager C and assert it shows up.
    // ──────────────────────────────────────────────────────────
    await ticketsService.reassign(t4.id, managerC.id, managerA.id);
    const listC = await ticketsService.list(managerC.id, 'MANAGER', {
        page: 1,
        limit: 100,
        sortOrder: 'desc'
    });
    const found = listC.tickets.find(t => t.id === t4.id);
    assertPresent(found, 'case6: reassigned ticket not visible to assigned-but-not-managing Manager C');
    assertEq(found.assignedToId, managerC.id, 'case6 assignedToId after reassign');
    console.log(
        '  ✓ case 6: ticket on a property C does NOT manage, reassigned to C → visible in C\'s MANAGER list'
    );

    // ──────────────────────────────────────────────────────────
    // Case 7 — updateStatus succeeds for the assigned-but-not-managing manager.
    //   t4 is on propA (managed by A), assigned to C. C may transition OPEN→IN_PROGRESS.
    // ──────────────────────────────────────────────────────────
    const updated = await ticketsService.updateStatus(managerC.id, 'MANAGER', t4.id, 'IN_PROGRESS');
    assertEq(updated.status, 'IN_PROGRESS', 'case7 status');
    console.log('  ✓ case 7: assigned-but-not-managing Manager C can transition OPEN → IN_PROGRESS');

    // ──────────────────────────────────────────────────────────
    // Case 8 — reassign rejects a non-MANAGER target (the USER guest).
    // ──────────────────────────────────────────────────────────
    let threw = false;
    try {
        await ticketsService.reassign(t1.id, guest.id, managerA.id);
    } catch (err) {
        threw = true;
        const statusCode = (err as { statusCode?: number }).statusCode;
        assertEq(statusCode, 400, 'case8 thrown statusCode');
        console.log(`  ✓ case 8: reassign to a USER throws AppError 400 ("${(err as Error).message}")`);
    }
    if (!threw) fail('case8: reassign to a USER should have thrown, but resolved');

    // ──────────────────────────────────────────────────────────
    // Case 9 (review-flagged) — a MANAGER mapped to a category then downgraded to USER
    //   must NOT be returned by userIdsForCategory (role filter on the join).
    //   managerD was mapped to EMERGENCY above (while still a MANAGER).
    // ──────────────────────────────────────────────────────────
    const beforeDowngrade = await ticketRoutingRepository.userIdsForCategory('EMERGENCY');
    if (!beforeDowngrade.includes(managerD.id)) {
        fail('case9 precondition: managerD should be in EMERGENCY pool before downgrade');
    }
    await db.user.update({ where: { id: managerD.id }, data: { role: 'USER' } });
    const afterDowngrade = await ticketRoutingRepository.userIdsForCategory('EMERGENCY');
    if (afterDowngrade.includes(managerD.id)) {
        fail('case9: downgraded USER must NOT appear in EMERGENCY pool');
    }
    console.log('  ✓ case 9: manager downgraded to USER is excluded from userIdsForCategory');

    // ──────────────────────────────────────────────────────────
    // Case 10 — Multiple-candidate selection: a pool with BOTH Manager A and
    //   Manager B. The ticket is created on propB (managed by B). resolveAssignee
    //   must pick the PROPERTY's manager (B) out of the pool — not A, and not just
    //   "the first pool member" (A was inserted first).
    //
    //   MOCK ORDERING: the 7 create calls above (t1..t7) advanced mockIndex from 0
    //   to 7; 7 % 7 === 0, so the NEXT create emits fixture 0 = NOISE again. We
    //   therefore re-route NOISE to [A, B] right before this create so the exact
    //   category this call emits is the one whose pool we configured.
    // ──────────────────────────────────────────────────────────
    await asAdmin('NOISE', [managerA.id, managerB.id]);
    const t10 = await createTicket(guest.id, propB.id, bookingB.id);
    assertEq(t10.category, 'NOISE', 'case10 category');
    assertEq(t10.assignedToId, managerB.id, 'case10 assignedToId');
    assertEq(t10.needsAssignment, false, 'case10 needsAssignment');
    console.log(
        '  ✓ case 10: NOISE pool = [A, B], property managed by B → auto-assigned to B (property manager, not first pool member)'
    );

    // ──────────────────────────────────────────────────────────
    // Case 11 — Reassign-to-null no longer re-triages. The admin triage queue is
    //   retired: the property's manager always retains visibility of tickets on
    //   their property, so an unassigned ticket is never stranded and needs no
    //   needsAssignment flag. Re-fetch as the property's manager (B) — an ADMIN
    //   can no longer read another user's ticket at all.
    // ──────────────────────────────────────────────────────────
    await ticketsService.reassign(t10.id, null, managerB.id);
    const refetched = await ticketsService.getById(managerB.id, 'MANAGER', t10.id);
    assertEq(refetched.assignedToId, null, 'case11 assignedToId');
    assertEq(refetched.needsAssignment, false, 'case11 needsAssignment');
    console.log('  ✓ case 11: reassign(ticketId, null) → unassigned, still visible to the property manager (no triage)');

    console.log('\n✓ All TICK-003 smoke assertions passed');
} finally {
    await cleanup();
    // RESTORE the real routing config that updateCategory() replaced. Re-create any
    // snapshot rows whose user still exists (smoke users are gone after cleanup);
    // skipDuplicates guards against rows that happened to survive.
    if (routingSnapshot.length > 0) {
        const alive = await db.user.findMany({
            where: { id: { in: routingSnapshot.map(r => r.userId) } },
            select: { id: true }
        });
        const aliveIds = new Set(alive.map(u => u.id));
        const rows = routingSnapshot.filter(r => aliveIds.has(r.userId));
        if (rows.length > 0) {
            await db.ticketCategoryAssignee.createMany({ data: rows, skipDuplicates: true });
            console.log(`  · restored ${rows.length} pre-existing routing mapping(s)`);
        }
    }
    await db.$disconnect();
}
