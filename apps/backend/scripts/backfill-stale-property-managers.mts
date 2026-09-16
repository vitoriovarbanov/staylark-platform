// Backfill: release properties whose "manager" is no longer a live MANAGER.
//
// WHY THIS IS MANDATORY, not cosmetic.
// Before the role narrowing, ADMINs could manage properties. Any such row left in
// the database is now stranded in a way nothing in the app can recover:
//
//   · invisible to every manager — the claim list matches `managerId IS NULL`
//   · unreachable by the admin   — managerMiddleware blocks them from property routes
//   · tickets on it are ASSIGNED TO THE ADMIN, who cannot see them (an admin's
//     ticket list is scoped to tickets they reported), so they are silently stranded
//   · booking and ticket emails go TO THE ADMIN, breaking the guarantee that admins
//     receive nothing operational
//
// Setting managerId to NULL puts the property back into the existing claim flow,
// where any manager can pick it up. The same applies to a manager who was demoted
// or soft-deleted while still holding rows.
//
// Open tickets assigned to the same stale user are unassigned too, so they fall to
// whoever claims the property rather than pointing at someone with no access.
//
// Dry run (default):  pnpm exec tsx --env-file=.env scripts/backfill-stale-property-managers.mts
// Apply:              pnpm exec tsx --env-file=.env scripts/backfill-stale-property-managers.mts --apply

const { db } = await import('../src/config/database.js');
const { TICKET_STATUSES_TERMINAL } = await import('@staylark/contract');

const APPLY = process.argv.includes('--apply');

/** A property is stale when its manager is missing, soft-deleted, or no longer a MANAGER. */
const STALE_MANAGER = {
    deletedAt: null,
    managerId: { not: null },
    manager: { is: { OR: [{ role: { not: 'MANAGER' as const } }, { deletedAt: { not: null } }] } }
};

try {
    const stale = await db.property.findMany({
        where: STALE_MANAGER,
        select: {
            id: true,
            title: true,
            city: true,
            managerId: true,
            manager: { select: { email: true, role: true, deletedAt: true } }
        }
    });

    if (stale.length === 0) {
        console.log('✓ No stale property managers — nothing to backfill.');
    } else {
        console.log(`Found ${stale.length} property/properties with a stale manager:\n`);
        for (const p of stale) {
            const why = p.manager?.deletedAt ? 'soft-deleted' : `role=${p.manager?.role}`;
            console.log(`  · ${p.title} (${p.city}) — manager ${p.manager?.email} [${why}]`);
        }

        const staleUserIds = [...new Set(stale.map(p => p.managerId).filter((id): id is string => id !== null))];
        const orphanTickets = await db.ticket.count({
            where: {
                propertyId: { in: stale.map(p => p.id) },
                assignedToId: { in: staleUserIds },
                deletedAt: null,
                status: { notIn: [...TICKET_STATUSES_TERMINAL] }
            }
        });
        console.log(`\n  ${orphanTickets} open ticket(s) assigned to those stale users will be unassigned.`);

        if (!APPLY) {
            console.log('\nDRY RUN — nothing written. Re-run with --apply to perform the backfill.');
        } else {
            const result = await db.$transaction(async tx => {
                const tickets = await tx.ticket.updateMany({
                    where: {
                        propertyId: { in: stale.map(p => p.id) },
                        assignedToId: { in: staleUserIds },
                        deletedAt: null,
                        status: { notIn: [...TICKET_STATUSES_TERMINAL] }
                    },
                    data: { assignedToId: null }
                });
                const properties = await tx.property.updateMany({
                    where: { id: { in: stale.map(p => p.id) } },
                    // previousManagerId keeps the audit trail of who held it.
                    data: { managerId: null }
                });
                return { tickets: tickets.count, properties: properties.count };
            });
            console.log(
                `\n✓ Released ${result.properties} property/properties and unassigned ${result.tickets} ticket(s).` +
                    '\n  They are now claimable by any manager from the Properties page.'
            );
        }
    }

    // Always report the invariant, applied or not.
    const remaining = await db.property.count({ where: STALE_MANAGER });
    const unassigned = await db.property.count({ where: { deletedAt: null, managerId: null } });
    console.log(`\nInvariant check: ${remaining} stale-managed, ${unassigned} unassigned (claimable).`);
    if (APPLY && remaining > 0) process.exitCode = 1;
} finally {
    await db.$disconnect();
}
