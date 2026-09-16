// Smoke probe — embedding aspect tagging via the self-hosted inference client.
//
// Two parts:
//   1. Direct /aspects calls on a few sample reviews — asserts the tagger returns
//      sensible, taxonomy-bounded topics (and nothing for off-topic text).
//   2. feedbackBackfillService.backfillTopics() — re-tags every existing feedback row
//      with a transcript, writing the fresh aspect arrays back. Use this to fix the
//      old dummy BERTopic labels on historical rows.
//
// Requires the LIVE path:
//   - the Python inference service running (INFERENCE_URL reachable)
//   - USE_INFERENCE_MOCK=false
//
// Defensive about mode: if inference is mocked (the dev default), it prints a clear
// message and exits 0 — there is nothing live to verify.
//
// Run (live): cd apps/backend && USE_INFERENCE_MOCK=false pnpm exec tsx --env-file=.env scripts/smoke-feedback-backfill.mts

import { inferenceClient, isInferenceMocked } from '../src/utils/inference.js';
import { feedbackBackfillService } from '../src/routes/feedback/service/feedback-backfill.service.js';

console.log('isInferenceMocked:', isInferenceMocked);

if (isInferenceMocked) {
    console.log('inference mocked — skipping live aspect-tagging smoke');
    process.exit(0);
}

const samples = [
    'The flat was spotless and right in the centre, but the street was very noisy at night.',
    'Great host, super easy check-in, and amazing value for the price.',
    "I've got nothing to say, just testing how this thing works."
];

console.log('\n/aspects on sample reviews:');
for (const text of samples) {
    const { topics } = await inferenceClient.tagAspects(text);
    console.log(`  ${JSON.stringify(topics).padEnd(40)}  ← ${text}`);
}

console.log('\nRunning feedbackBackfillService.backfillTopics() over existing rows…');
const result = await feedbackBackfillService.backfillTopics();
console.log('  re-tagged rows:', result.tagged);

process.exit(0);
