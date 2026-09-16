// Real-data pricing trainer (v1). Fits the pricing regression on real captured
// PriceQuote rows and writes apps/backend/prisma/pricing-model.json — same 8
// coefficients, same sigmoid, same safety bounds as the synthetic model, so it
// drops into predictMultiplier unchanged.
//
// Method (see docs/plans/2026-07-07-pricing-real-data-training-foundation-design.md §2):
//   1. Explode each PriceQuote into per-night, leakage-safe feature rows.
//   2. Demand model — a linear-probability fit of `converted ~ features` (real outcomes).
//   3. Policy — map each row's demand PERCENTILE to a target multiplier (median → 1.0).
//   4. Invert the sigmoid → target z, refit the 8 runtime coefficients.
//   5. Shrinkage-blend with the currently-committed model: w = n/(n+k).
//   6. Validate (coefficient signs, held-out R²) and write.
//
// v1 does NOT isolate price elasticity from confounded demand — that's the deferred v2
// (see the design doc). v1 is a real, bounded, non-circular improvement over synthetic.
//
// Usage:
//   pnpm run train:pricing:real                       # gated; against DATABASE_URL (.env)
//   DATABASE_URL="$DATABASE_PUBLIC_URL" pnpm run train:pricing:real   # against prod
//   pnpm run train:pricing:real -- --dry-run          # fit + print, write nothing
//   pnpm run train:pricing:real -- --force --dry-run  # bypass the gate for TESTING only
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from '../src/config/database.js';
import { countGateInputs } from './lib/gate-counts.js';
import { evaluateGate } from '../src/routes/pricing/service/pricing-gate.js';
import { quoteToNights, type QuoteRow } from './lib/pricing-features.js';
import { fitRealModel, INSUFFICIENT_TRAINING_ROWS, type Coefficients } from './lib/fit-real-model.js';

// --- Tunable knobs (data-dependent; documented defaults). Tune deliberately. ---
const SHRINKAGE_K = 500; // blend weight w = n/(n+k). At n = k, 50% real / 50% prior.
const TEST_FRACTION = 0.2; // newest fraction held out (time-based split, catches drift).
const R2_WARN = 0.3; // warn below this — real data is far noisier than synthetic's ~0.85.
const RIDGE = 1e-4; // numerical stabiliser for the OLS solve at low volume.

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const force = argv.includes('--force');

// 1. Data gate.
const counts = await countGateInputs();
const gate = evaluateGate(counts);
if (!gate.met && !force) {
    console.log(`Gate not met (${gate.reasons.join(', ')}). Synthetic model is correct; not retraining.`);
    await db.$disconnect();
    process.exit(0);
}
if (!gate.met) {
    console.warn(
        `⚠️  --force: bypassing gate (${gate.reasons.join(', ')}). For TESTING only — do not ship this model.`
    );
}

// 2. Extract quotes (read-only), oldest first for the time-based split.
const quotes = await db.priceQuote.findMany({
    select: { checkIn: true, checkOut: true, createdAt: true, occupancy: true, converted: true },
    orderBy: { createdAt: 'asc' }
});
await db.$disconnect();

if (quotes.length === 0) {
    console.error('No PriceQuote rows to train on — capture some traffic first.');
    process.exit(1);
}

// 3. Explode into per-night samples and load the prior (current committed model).
const samples = quotes.flatMap(q => quoteToNights(q as QuoteRow));
const MODEL_PATH = resolve(import.meta.dirname, '..', 'prisma', 'pricing-model.json');
const prior = (JSON.parse(readFileSync(MODEL_PATH, 'utf8')) as { coefficients: Coefficients }).coefficients;

// 4. Fit (pure pipeline — stress-tested in pricing-trainer-scenarios.test.ts).
let result;
try {
    result = fitRealModel(samples, prior, quotes.length, {
        shrinkageK: SHRINKAGE_K,
        testFraction: TEST_FRACTION,
        ridge: RIDGE,
        r2Warn: R2_WARN
    });
} catch (err) {
    if (err instanceof Error && err.message === INSUFFICIENT_TRAINING_ROWS) {
        console.error('Not enough training rows to fit 8 features. Capture more quotes first.');
        process.exit(1);
    }
    if (err instanceof Error && err.message.includes('Singular matrix')) {
        console.error(
            'OLS solve was singular — the captured quotes lack feature variation (e.g. all same ' +
                'occupancy/season). Capture more diverse traffic before training.'
        );
        process.exit(1);
    }
    throw err;
}

const { coefficients, heldOutR2, blendWeight: w, trainRows } = result;
console.log(
    `Trained on ${quotes.length} quotes (${samples.length} property-nights, ${trainRows} train rows). ` +
        `Blend w=${w.toFixed(3)} → real ${(w * 100).toFixed(0)}% / prior ${((1 - w) * 100).toFixed(0)}%.`
);
console.log(`Held-out R² = ${Number.isNaN(heldOutR2) ? 'n/a' : heldOutR2.toFixed(4)}`);
console.log('Coefficients:', coefficients);
if (result.warnings.length) console.warn('⚠️  ' + result.warnings.join('\n⚠️  '));

// 5. Write (unless --dry-run).
const model = {
    modelVersion: `${new Date().toISOString().split('T')[0]}-v2`,
    trainedAt: new Date().toISOString(),
    dataSource: 'real' as const,
    rngSeed: null,
    rSquared: Number.isNaN(heldOutR2) ? 0 : Number(heldOutR2.toFixed(4)),
    coefficients
};

if (dryRun) {
    console.log('\n--dry-run: fit complete, pricing-model.json NOT written.');
    process.exit(0);
}
writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2) + '\n');
console.log(`\nWrote ${MODEL_PATH} (dataSource=real). Review the coefficient diff before shipping.`);
