// Smoke probe — feedback aggregation shape + new metrics fields.
//
// Auto-discovers a property that has feedback, then calls
// feedbackRepository.aggregateByPropertyId directly against the dev DB for
// (a) all-time and (b) a last-30-days window, printing the new metrics fields
// for eyeballing. Read-only.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-feedback-stats.mts

import { db } from '../src/config/database.js';
import { feedbackRepository } from '../src/routes/feedback/repository/feedback.repository.js';

function show(label: string, agg: Awaited<ReturnType<typeof feedbackRepository.aggregateByPropertyId>>) {
    console.log(`\n── ${label} ─────────────────────────`);
    console.log('totalCount        :', agg.totalCount);
    console.log('responseRate      :', agg.responseRate, '(completedBookings:', agg.completedBookings, ')');
    console.log('negativeRate      :', agg.negativeRate);
    console.log('voice / text      :', agg.voiceCount, '/', agg.textCount);
    console.log('avgDaysToFeedback :', agg.avgDaysToFeedback);
    console.log('scoreDistribution :', agg.scoreDistribution);
    console.log('needsAttention #  :', agg.needsAttention.length);
    console.log('previous          :', agg.previous);
}

const firstFeedback = await db.feedback.findFirst({
    where: { deletedAt: null },
    select: { propertyId: true }
});

if (!firstFeedback) {
    console.log('No feedback in dev DB — submit some feedback first (see project_smoke_test_setup memory).');
    process.exit(0);
}

const propertyId = firstFeedback.propertyId;
console.log('Using propertyId:', propertyId);

const iso = (d: Date) => d.toISOString().split('T')[0];
const today = new Date();
const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

show('all-time', await feedbackRepository.aggregateByPropertyId(propertyId));
const ranged = await feedbackRepository.aggregateByPropertyId(propertyId, iso(start), iso(today));
show('last 30 days', ranged);

console.log('\nSanity checks:');
console.log(
    '  scoreDistribution sums <= totalCount:',
    Object.values(ranged.scoreDistribution).reduce((s, n) => s + n, 0),
    '<=',
    ranged.totalCount
);
console.log('  voice + text == totalCount:', ranged.voiceCount + ranged.textCount, '==', ranged.totalCount);
console.log(
    '  responseRate in [0,1] or null:',
    ranged.responseRate === null || (ranged.responseRate >= 0 && ranged.responseRate <= 1)
);

process.exit(0);
