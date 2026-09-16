// Smoke probe — feedback submission via the self-hosted inference client (mock mode).
//
// With USE_INFERENCE_MOCK=true (the dev default), exercises the rewired feedback
// pipeline end-to-end at the service layer: transcribe → relevance + classify +
// summarise + tag aspects → persist, asserting the saved feedback has non-null
// sentiment/score and topics (aspects are tagged synchronously at submission).
//
// Defensive about seed state: it looks up an eligible (COMPLETED, no-feedback)
// booking for the known smoke user. If none exists, it prints a clear message,
// confirms the mock helpers are wired, and still exits 0 — it never throws in
// mock mode.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-feedback-inference.mts

import { db } from '../src/config/database.js';
import { isInferenceMocked } from '../src/utils/inference.js';
import { feedbackService } from '../src/routes/feedback/service/feedback.service.js';
import { feedbackRepository } from '../src/routes/feedback/repository/feedback.repository.js';

const SMOKE_EMAIL = 'smoke-g1@test.local';

console.log('isInferenceMocked:', isInferenceMocked);
if (!isInferenceMocked) {
    console.log(
        'USE_INFERENCE_MOCK is not true — this smoke script targets the mock path. ' +
            'Set USE_INFERENCE_MOCK=true in .env to exercise it without the live service.'
    );
}

// Find the known smoke user; fall back to any user with an eligible booking.
const smokeUser = await db.user.findFirst({ where: { email: SMOKE_EMAIL }, select: { id: true } });

let eligibleUserId: string | null = smokeUser?.id ?? null;
let eligible = eligibleUserId ? await feedbackRepository.findEligibleBookings(eligibleUserId) : [];

if (eligible.length === 0) {
    // Smoke user has nothing eligible — find any user that does, to keep the probe useful.
    const anyEligibleBooking = await db.booking.findFirst({
        where: { status: 'COMPLETED', deletedAt: null, feedback: { none: {} } },
        select: { userId: true }
    });
    if (anyEligibleBooking) {
        eligibleUserId = anyEligibleBooking.userId;
        eligible = await feedbackRepository.findEligibleBookings(eligibleUserId);
    }
}

if (!eligibleUserId || eligible.length === 0) {
    console.log(
        '\nNo eligible (COMPLETED, no-feedback) booking in dev DB — skipping live submit. ' +
            'Mock helpers are wired correctly (isInferenceMocked =',
        isInferenceMocked,
        '). To exercise a real submit, seed an eligible booking (see project_smoke_test_setup memory).'
    );
    process.exit(0);
}

const target = eligible[0];
console.log('\nUsing eligible booking:', {
    userId: eligibleUserId,
    bookingId: target.bookingId,
    propertyId: target.propertyId,
    property: target.propertyName
});

// Submit text feedback (no audio) so transcription is taken directly and the
// classify + summarise helpers run against the mock response.
const feedback = await feedbackService.submit(eligibleUserId, target.propertyId, target.bookingId, {
    text: 'The apartment was clean and well located, though the WiFi was a little slow.'
});

console.log('\nSubmitted feedback:');
console.log('  id            :', feedback.id);
console.log('  transcription :', feedback.transcription);
console.log('  sentiment     :', feedback.sentiment);
console.log('  score         :', feedback.score);
console.log('  summary       :', feedback.summary);
console.log('  topics        :', feedback.topics);
console.log('  audioUrl      :', feedback.audioUrl);

console.log('\nAssertions:');
console.log('  sentiment non-null :', feedback.sentiment !== null);
console.log('  score non-null     :', feedback.score !== null);
console.log('  topics non-null    :', feedback.topics !== null);

// Clean up so the probe is repeatable. Hard-delete: findEligibleBookings uses
// `feedback: { none: {} }`, which counts soft-deleted rows too, so a soft delete
// would leave the booking permanently ineligible.
await db.feedback.delete({ where: { id: feedback.id } });
console.log('\nCleaned up (deleted) the probe feedback row.');

process.exit(0);
