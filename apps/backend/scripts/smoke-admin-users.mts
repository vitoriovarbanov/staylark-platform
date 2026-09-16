// ADMIN-004 smoke probe — user management service layer.
//
// Exercises usersService end-to-end against the dev DB: list/filter, promote,
// self-role guard, last-admin guard, soft-delete/restore visibility. (Invite is
// now the dedicated invitation flow — see smoke-invitations.mts.)
//
// Role-based 403s for non-admins are enforced by the shared
// `router.use(authMiddleware, adminMiddleware)` (identical to every other admin
// route) and are exercised by the Task 8 manual E2E — not reachable from this
// service-layer probe, which trusts its actor argument.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-admin-users.mts

import { usersService } from '../src/routes/users/service/users.service.js';
import { db } from '../src/config/database.js';

const TAG = 'admin004-smoke-';
// A function declaration (not a const arrow) so TypeScript treats it as a
// control-flow terminator and narrows after `if (!x) fail(...)` guards.
function fail(msg: string): never {
    throw new Error(`SMOKE FAIL: ${msg}`);
}

/** Asserts an async call throws with the expected HTTP status code. */
async function expectStatus(fn: () => Promise<unknown>, status: number, label: string): Promise<void> {
    try {
        await fn();
    } catch (err) {
        const got = (err as { statusCode?: number }).statusCode;
        if (got === status) return;
        fail(`${label} — expected status ${status}, got ${got} (${(err as Error).message})`);
    }
    fail(`${label} — expected throw, none happened`);
}

const email = (suffix: string) => `${TAG}${suffix}@test.local`;
const cleanup = async () => {
    await db.user.deleteMany({ where: { email: { startsWith: TAG } } });
};

console.log('ADMIN-004 smoke — user management\n');
await cleanup();

try {
    // ── Seed actors ───────────────────────────────────────────
    const admin = await db.user.create({
        data: { name: 'Smoke Admin', email: email('admin'), emailVerified: true, role: 'ADMIN' }
    });
    const actor = { id: admin.id, role: 'ADMIN' };
    const guest = await db.user.create({
        data: { name: 'Smoke Guest', email: email('guest'), emailVerified: true, role: 'USER' }
    });
    // A second admin used as the demote *target* in the last-admin test (5).
    const admin2 = await db.user.create({
        data: { name: 'Smoke Admin 2', email: email('admin2'), emailVerified: true, role: 'ADMIN' }
    });

    // 1 ── List returns paginated rows, honours search + role filters.
    const listed = await usersService.list({ page: 1, limit: 20, includeDeleted: false, sortOrder: 'desc' });
    if (listed.page !== 1 || listed.limit !== 20) fail('list did not echo page/limit');
    if (listed.total < 2) fail(`list total too low: ${listed.total}`);
    const bySearch = await usersService.list({ page: 1, limit: 20, includeDeleted: false, search: 'Smoke Guest', sortOrder: 'desc' });
    if (!bySearch.data.some(u => u.id === guest.id)) fail('search did not find seeded guest');
    const byRole = await usersService.list({ page: 1, limit: 50, includeDeleted: false, role: 'ADMIN', sortOrder: 'desc' });
    if (byRole.data.some(u => u.role !== 'ADMIN')) fail('role filter leaked non-admins');
    console.log('  ✓ 1. list + search + role filter');

    // 3 ── Promote USER → MANAGER.
    const promoted = await usersService.update(actor, guest.id, { role: 'MANAGER' });
    if (promoted.role !== 'MANAGER') fail(`promote failed: ${promoted.role}`);
    console.log('  ✓ 3. promote USER → MANAGER');

    // 4 ── Cannot change own role → 403.
    await expectStatus(() => usersService.update(actor, admin.id, { role: 'USER' }), 403, '4. self-demote');
    console.log('  ✓ 4. self role-change blocked (403)');

    // 5 ── Cannot demote the last admin → 400. Temporarily hide every alive admin
    //      EXCEPT admin2 (reversible, no session purge) so admin2 is the last one,
    //      then have `admin` (a different actor) try to demote admin2.
    const others = await db.user.findMany({
        where: { role: 'ADMIN', deletedAt: null, id: { not: admin2.id } },
        select: { id: true }
    });
    const hiddenIds = others.map(o => o.id);
    await db.user.updateMany({ where: { id: { in: hiddenIds } }, data: { deletedAt: new Date() } });
    try {
        const aliveAdmins = await db.user.count({ where: { role: 'ADMIN', deletedAt: null } });
        if (aliveAdmins !== 1) fail('precondition: expected exactly 1 alive admin');
        await expectStatus(() => usersService.update(actor, admin2.id, { role: 'USER' }), 400, '5. last-admin demote');
        // Same guard must also block soft-deleting the last admin.
        await expectStatus(() => usersService.softDelete(admin2.id, actor), 400, '5. last-admin delete');
    } finally {
        await db.user.updateMany({ where: { id: { in: hiddenIds } }, data: { deletedAt: null } });
    }
    console.log('  ✓ 5. last-admin demote + delete blocked (400)');

    // 6 ── Soft-delete hides from default list, visible with includeDeleted.
    await usersService.softDelete(guest.id, actor);
    const afterDelete = await usersService.list({ page: 1, limit: 100, includeDeleted: false, sortOrder: 'desc' });
    if (afterDelete.data.some(u => u.id === guest.id)) fail('soft-deleted user still in default list');
    const withDeleted = await usersService.list({ page: 1, limit: 100, includeDeleted: true, sortOrder: 'desc' });
    if (!withDeleted.data.some(u => u.id === guest.id)) fail('soft-deleted user missing from includeDeleted list');
    console.log('  ✓ 6. soft-delete visibility');

    // 7 ── Restore brings the user back into the default list.
    await usersService.restore(actor, guest.id);
    const afterRestore = await usersService.list({ page: 1, limit: 100, includeDeleted: false, sortOrder: 'desc' });
    if (!afterRestore.data.some(u => u.id === guest.id)) fail('restored user not back in default list');
    console.log('  ✓ 7. restore');

    console.log('\n✓ All ADMIN-004 service-layer smoke assertions passed');
    console.log('  (8. non-admin 403 enforced by shared adminMiddleware — see Task 8 E2E)');
} finally {
    await cleanup();
    await db.$disconnect();
}
