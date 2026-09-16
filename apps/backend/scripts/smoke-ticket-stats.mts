// Smoke probe — ticket stats aggregation shape + numbers.
//
// Calls adminRepository.getTicketStats directly against the dev DB with (a) no
// filters and (b) a last-30-days window, printing the full result for eyeballing.
// Read-only.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-ticket-stats.mts

import { adminRepository } from '../src/routes/admin/repository/admin.repository.js';
import { db } from '../src/config/database.js';

function show(label: string, stats: Awaited<ReturnType<typeof adminRepository.getTicketStats>>) {
    console.log(`\n── ${label} ─────────────────────────`);
    console.log('statusCounts     :', stats.statusCounts);
    console.log('urgentOpenCount  :', stats.urgentOpenCount);
    console.log('resolvedInRange  :', stats.resolvedInRange);
    console.log('avg/median hours :', stats.avgResolutionHours, '/', stats.medianResolutionHours);
    console.log('byPriority       :', stats.byPriority);
    console.log('byCategory       :', stats.byCategory);
    console.log('byAssignee       :', stats.byAssignee);
}

const iso = (d: Date) => d.toISOString().split('T')[0];
const today = new Date();
const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

// Ticket stats are manager-scoped: build the scope from every alive property so
// this probe still reports on the whole dataset.
const scope = (await db.property.findMany({ where: { deletedAt: null }, select: { id: true } })).map(p => p.id);

const all = await adminRepository.getTicketStats(scope);
show('all-time, all properties', all);

const ranged = await adminRepository.getTicketStats(scope, iso(start), iso(today));
show('last 30 days', ranged);

console.log('\nSanity checks:');
console.log('  statusCounts non-negative:', Object.values(all.statusCounts).every(n => n >= 0));
console.log(
    '  byPriority sum == open+inProgress:',
    all.byPriority.reduce((s, p) => s + p.count, 0),
    '==',
    all.statusCounts.open + all.statusCounts.inProgress
);
