// Smoke probe — resolvedAt is stamped on → RESOLVED and cleared on reopen.
//
// Read-mostly probe: finds one active ticket, drives it OPEN/IN_PROGRESS → RESOLVED
// → IN_PROGRESS via the service, printing resolvedAt at each step, then restores the
// original status. Asserts resolvedAt is non-null after RESOLVED and null after reopen.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-ticket-resolved-at.mts

import { db } from '../src/config/database.js';
import { ticketsService } from '../src/routes/tickets/service/tickets.service.js';

const ticket = await db.ticket.findFirst({
    where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    select: { id: true, status: true, assignedToId: true }
});

if (!ticket) {
    console.log('No active ticket found — seed one, then re-run.');
    process.exit(0);
}

console.log(`Using ticket ${ticket.id} (status=${ticket.status})`);
const original = ticket.status;

try {
    // Drive to IN_PROGRESS first if needed (OPEN → IN_PROGRESS → RESOLVED).
    if (ticket.status === 'OPEN') {
        await ticketsService.updateStatus('smoke', 'ADMIN', ticket.id, 'IN_PROGRESS');
    }
    const resolved = await ticketsService.updateStatus('smoke', 'ADMIN', ticket.id, 'RESOLVED');
    const afterResolve = await db.ticket.findUnique({ where: { id: ticket.id }, select: { resolvedAt: true } });
    console.log(`After RESOLVED  → resolvedAt = ${afterResolve?.resolvedAt?.toISOString() ?? 'NULL'}`);
    console.assert(afterResolve?.resolvedAt != null, 'EXPECTED resolvedAt to be set after RESOLVED');
    void resolved;

    await ticketsService.updateStatus('smoke', 'ADMIN', ticket.id, 'IN_PROGRESS');
    const afterReopen = await db.ticket.findUnique({ where: { id: ticket.id }, select: { resolvedAt: true } });
    console.log(`After reopen    → resolvedAt = ${afterReopen?.resolvedAt?.toISOString() ?? 'NULL'}`);
    console.assert(afterReopen?.resolvedAt == null, 'EXPECTED resolvedAt to be cleared after reopen');
} finally {
    // Restore original status directly (bypass transition rules).
    await db.ticket.update({
        where: { id: ticket.id },
        data: { status: original, resolvedAt: original === 'RESOLVED' ? new Date() : null }
    });
    console.log(`Restored ticket to ${original}`);
}
