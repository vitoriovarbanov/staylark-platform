// TICK-005 smoke probe — dynamic ticket sorting via buildOrderBy.
//
// Exercises ticketsRepository.list({}, query) directly against the dev DB for
// three orderings so the resolved Prisma `orderBy` can be eyeballed:
//   (a) default / no sortBy → priority desc, then createdAt desc
//   (b) sortBy='assignee', sortOrder='asc'  → assigned first, unassigned (null) last
//   (c) sortBy='assignee', sortOrder='desc' → unassigned (null) first, assigned last
//   (d) sortBy='status',   sortOrder='asc'  → OPEN < IN_PROGRESS < RESOLVED
//
// This is a read-only probe: it seeds nothing and asserts nothing hard, since
// local data variety is incidental — the point is to confirm the ordering logic
// produces the expected sequence. Sparse data is noted, not failed.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-ticket-sort.mts

import { ticketsRepository } from '../src/routes/tickets/repository/tickets.repository.js';
import type { TicketQuery } from '@staylark/contract';
import { db } from '../src/config/database.js';

// Base query: list() requires page/limit/sortOrder (post-Zod-parse shape).
const base = { page: 1, limit: 50, sortOrder: 'desc' } as const;

function printRows(label: string, tickets: Awaited<ReturnType<typeof ticketsRepository.list>>['tickets']) {
    console.log(`\n── ${label} (${tickets.length} rows) ─────────────────────────`);
    if (tickets.length === 0) {
        console.log('  (no tickets)');
        return;
    }
    for (const t of tickets) {
        console.log(
            `  ${t.priority.padEnd(8)} | ${t.status.padEnd(12)} | assignee=${String(t.assignedToId).padEnd(24)} | ${t.createdAt}`
        );
    }
}

console.log('TICK-005 smoke — dynamic ticket sorting');

try {
    // (a) default / no sortBy → fallback [{ priority: 'desc' }, { createdAt: 'desc' }]
    const def = await ticketsRepository.list({}, { ...base } as TicketQuery);
    printRows('default (no sortBy) → priority desc, then createdAt desc', def.tickets);

    // (b) assignee asc → assigned rows first, unassigned (null) last
    const byAssignee = await ticketsRepository.list({}, {
        ...base,
        sortBy: 'assignee',
        sortOrder: 'asc'
    } as TicketQuery);
    printRows("sortBy='assignee' sortOrder='asc' → assigned first, null last", byAssignee.tickets);

    // (c) assignee desc → unassigned (null) rows first, assigned last
    const byAssigneeDesc = await ticketsRepository.list({}, {
        ...base,
        sortBy: 'assignee',
        sortOrder: 'desc'
    } as TicketQuery);
    printRows("sortBy='assignee' sortOrder='desc' → null first, assigned last", byAssigneeDesc.tickets);

    // (d) status asc → OPEN < IN_PROGRESS < RESOLVED (enum order)
    const byStatus = await ticketsRepository.list({}, {
        ...base,
        sortBy: 'status',
        sortOrder: 'asc'
    } as TicketQuery);
    printRows("sortBy='status' sortOrder='asc' → OPEN, IN_PROGRESS, RESOLVED", byStatus.tickets);

    if (def.total < 3) {
        console.log(
            `\nNOTE: only ${def.total} ticket(s) in the local DB — orderings are correct by construction but hard to eyeball with sparse data.`
        );
    }

    console.log('\n✓ smoke run complete (eyeball the orderings above)');
} finally {
    await db.$disconnect();
}
