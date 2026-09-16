// Staff-removal guard smoke probe — D-07 (last manager) and D-08 (last admin).
//
// Both need a DB shape the normal dataset never has: exactly one ADMIN, or
// exactly one MANAGER. The probe manufactures each shape, asserts the guard
// fires, and restores everything it parked.
//
// D-07 is a genuine design corner, deliberately left as a hard stop: a manager
// who still holds properties cannot be demoted while they are the only manager,
// because there is nobody to inherit. Failing closed is correct — the alternative
// is orphaning the portfolio — but the error message has to say WHY, which is
// what this asserts. A manager holding NOTHING can always be demoted, which is
// the escape hatch: move the properties first, then demote.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-staff-removal-guards.mts

const { db } = await import('../src/config/database.js');
const { usersService } = await import('../src/routes/users/service/users.service.js');

const TAG = 'guards-';
const PROP_TAG = 'GUARDS-prop';

const cleanup = async () => {
    await db.ticket.deleteMany({ where: { property: { title: PROP_TAG } } });
    await db.booking.deleteMany({ where: { property: { title: PROP_TAG } } });
    await db.property.deleteMany({ where: { title: PROP_TAG } });
    await db.user.deleteMany({ where: { email: { startsWith: TAG } } });
};

const mk = (s: string, role: 'USER' | 'MANAGER' | 'ADMIN') =>
    db.user.create({ data: { name: `Guards ${s}`, email: `${TAG}${s}@test.local`, emailVerified: true, role } });

let allOk = true;
const check = (ok: boolean, label: string, detail = '') => {
    if (!ok) allOk = false;
    console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${label}${detail ? ' :: ' + detail : ''}`);
};
const attempt = async (fn: () => Promise<unknown>) => {
    try {
        await fn();
        return { ok: true, msg: '' };
    } catch (e) {
        return { ok: false, msg: (e as Error).message };
    }
};

console.log('Staff-removal guards smoke — last admin / last manager\n');
await cleanup();

// Park every PRE-EXISTING admin so the probe's own two are genuinely the only
// admins in the system — otherwise "the last admin" is never reached and the
// guard silently never fires. Restored in the finally block.
const preExistingAdmins = (
    await db.user.findMany({ where: { role: 'ADMIN', deletedAt: null }, select: { id: true } })
).map(a => a.id);
await db.user.updateMany({ where: { id: { in: preExistingAdmins } }, data: { role: 'USER' } });

let parkedManagers: string[] = [];

try {
    const adminA = await mk('adminA', 'ADMIN');
    const adminB = await mk('adminB', 'ADMIN');
    const mgr = await mk('mgr', 'MANAGER');

    // ── D-08 — last-admin guard ─────────────────────────────────
    let r = await attempt(() =>
        usersService.update({ id: adminB.id, role: 'ADMIN' }, adminA.id, { name: 'Guards adminA', role: 'MANAGER' })
    );
    check(r.ok, 'D-08a with two admins, one may be demoted', r.msg);

    const adminsNow = await db.user.count({ where: { role: 'ADMIN', deletedAt: null } });
    check(adminsNow === 1, 'D-08a2 exactly one ADMIN remains in the whole system', `count=${adminsNow}`);

    r = await attempt(() =>
        usersService.update({ id: adminA.id, role: 'MANAGER' }, adminB.id, { name: 'Guards adminB', role: 'MANAGER' })
    );
    check(!r.ok && /last admin/i.test(r.msg), 'D-08b demoting the LAST admin is refused', r.msg);

    r = await attempt(() => usersService.softDelete(adminB.id, { id: adminA.id, role: 'MANAGER' }));
    check(!r.ok && /last admin/i.test(r.msg), 'D-08c deleting the LAST admin is refused', r.msg);

    // ── D-07 — last-manager deadlock ────────────────────────────
    await db.user.update({ where: { id: adminA.id }, data: { role: 'ADMIN' } }); // an actor for D-07
    const prop = await db.property.create({
        data: {
            title: PROP_TAG,
            description: 'x',
            type: 'APARTMENT',
            city: 'GuardsCity',
            address: 'x',
            nightlyPrice: 100,
            managerId: mgr.id
        }
    });

    parkedManagers = (
        await db.user.findMany({
            where: { role: 'MANAGER', deletedAt: null, id: { not: mgr.id } },
            select: { id: true }
        })
    ).map(o => o.id);
    await db.user.updateMany({ where: { id: { in: parkedManagers } }, data: { role: 'USER' } });

    const managerCount = await db.user.count({ where: { role: 'MANAGER', deletedAt: null } });
    check(managerCount === 1, 'D-07a set up: exactly one MANAGER remains', `count=${managerCount}`);

    r = await attempt(() =>
        usersService.update({ id: adminA.id, role: 'ADMIN' }, mgr.id, { name: 'Guards mgr', role: 'USER' })
    );
    check(
        !r.ok && /manages properties|open tickets/i.test(r.msg),
        'D-07b demoting the last manager WITH a portfolio is refused, and says why',
        r.msg
    );

    r = await attempt(() =>
        usersService.update({ id: adminA.id, role: 'ADMIN' }, mgr.id, {
            name: 'Guards mgr',
            role: 'USER',
            successorManagerId: mgr.id
        })
    );
    check(!r.ok, 'D-07c self-succession is refused, so the deadlock holds', r.msg);

    const stillManaged = await db.property.findUniqueOrThrow({ where: { id: prop.id } });
    check(stillManaged.managerId === mgr.id, 'D-07d the property was NOT orphaned by the failed attempts');

    // ── D-07e — the escape hatch ────────────────────────────────
    //   Strip the portfolio, and the same demote succeeds without a successor.
    //   There is nothing left to strand, so the requirement lifts.
    await db.property.update({ where: { id: prop.id }, data: { deletedAt: new Date() } });
    r = await attempt(() =>
        usersService.update({ id: adminA.id, role: 'ADMIN' }, mgr.id, { name: 'Guards mgr', role: 'USER' })
    );
    check(r.ok, 'D-07e once the portfolio is empty, the last manager CAN be demoted', r.msg);

    console.log(allOk ? '\n✓ Staff-removal guards verified' : '\n✗ FAILURES above');
    if (!allOk) process.exitCode = 1;
} finally {
    await cleanup();
    await db.user.updateMany({ where: { id: { in: parkedManagers } }, data: { role: 'MANAGER' } });
    await db.user.updateMany({ where: { id: { in: preExistingAdmins } }, data: { role: 'ADMIN' } });
    console.log(`  · restored ${preExistingAdmins.length} admin(s) and ${parkedManagers.length} manager(s)`);
    await db.$disconnect();
}
