// PRICE-007 smoke probe — duration discount tiers.
//
// 1. No DURATION rules: 7-night quote is baseline
// 2. Weekly (0.9 @ 7): 6-night unchanged
// 3. Weekly (0.9 @ 7): 7-night = baseline × 0.9; rule name on every night
// 4. + Monthly (0.8 @ 28): 30-night picks monthly only (no stacking)
// 5. Two rules tied at minNights 7: lower multiplier wins
// 6. Property-scoped 0.9 vs global 0.85 (tied minNights): lower multiplier wins regardless of scope
// 7. Rule with endDate < checkOut: doesn't apply (strict cover)
// 8. Per-night seasonal + DURATION: both apply; duration not double-applied
//
// Run: pnpm --filter @staylark/backend tsx scripts/smoke-price-007.mts

import { pricingService } from '../src/routes/pricing/service/pricing.service.js';
import { db } from '../src/config/database.js';

const PLOVDIV = '00000000-0000-4000-b000-000000000004';
const ADMIN_ID = '00000000-0000-4000-a000-000000000003';

const fail = (msg: string): never => {
    throw new Error(`SMOKE FAIL: ${msg}`);
};

/** Assertion guard that both fails the smoke run and narrows the value for TS. */
function assertPresent<T>(value: T, msg: string): asserts value is NonNullable<T> {
    if (value == null) fail(msg);
}

const approx = (a: number, b: number, eps = 0.05) => Math.abs(a - b) < eps;

const cleanup = async () => {
    await db.pricingRule.deleteMany({
        where: { name: { startsWith: 'PRICE-007 smoke ' } }
    });
};

const createRule = (overrides: {
    name: string;
    type: 'SEASONAL' | 'DURATION_DISCOUNT';
    multiplier: number;
    minNights: number | null;
    propertyId: string | null;
}) =>
    db.pricingRule.create({
        data: {
            propertyId: overrides.propertyId,
            name: overrides.name,
            type: overrides.type,
            multiplier: overrides.multiplier,
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2099-12-31T00:00:00.000Z'),
            isActive: true,
            minNights: overrides.minNights
        }
    });

console.log('PRICE-007 smoke — duration discount tiers\n');

await cleanup();
pricingService.invalidateCache();

// Pin to a future date range; offset chosen so day-of-week pattern stable.
const checkIn7 = '2030-03-04'; // Mon
const out7 = '2030-03-11'; // 7 nights
const out6 = '2030-03-10'; // 6 nights
const out30 = '2030-04-03'; // 30 nights

try {
    // ── 1. No rules: baseline ─────────────────────────────────
    const baseline7 = await pricingService.quote(PLOVDIV, checkIn7, out7);
    if (baseline7.breakdown.some(n => n.appliedRules.some(r => r.startsWith('PRICE-007')))) {
        fail('Test 1: appliedRules unexpectedly contains a smoke rule');
    }
    if (baseline7.durationDiscount !== null) {
        fail(`Test 1: durationDiscount should be null when no rule fires, got ${JSON.stringify(baseline7.durationDiscount)}`);
    }
    console.log(`  ✓ Test 1 — 7-night baseline = €${baseline7.totalPrice.toFixed(2)} (durationDiscount=null)`);

    // Seed: weekly 0.9 @ 7
    const weekly = await createRule({
        name: 'PRICE-007 smoke Weekly 0.9',
        type: 'DURATION_DISCOUNT',
        multiplier: 0.9,
        minNights: 7,
        propertyId: null
    });
    pricingService.invalidateCache();

    // ── 2. 6 nights below threshold ───────────────────────────
    const six = await pricingService.quote(PLOVDIV, checkIn7, out6);
    if (six.breakdown.some(n => n.appliedRules.includes(weekly.name))) {
        fail('Test 2: weekly rule should not apply to a 6-night stay');
    }
    console.log(`  ✓ Test 2 — 6-night unchanged at €${six.totalPrice.toFixed(2)}`);

    // ── 3. 7 nights with weekly ───────────────────────────────
    const seven = await pricingService.quote(PLOVDIV, checkIn7, out7);
    if (!approx(seven.totalPrice, baseline7.totalPrice * 0.9, 1)) {
        fail(`Test 3: expected ≈${(baseline7.totalPrice * 0.9).toFixed(2)}, got ${seven.totalPrice.toFixed(2)}`);
    }
    assertPresent(seven.durationDiscount, 'Test 3: durationDiscount should be populated');
    if (seven.durationDiscount.ruleName !== weekly.name) {
        fail(`Test 3: durationDiscount.ruleName mismatch — got ${seven.durationDiscount.ruleName}`);
    }
    if (seven.durationDiscount.percent !== 10) {
        fail(`Test 3: expected percent=10 for multiplier 0.9, got ${seven.durationDiscount.percent}`);
    }
    if (!approx(seven.durationDiscount.originalTotal, baseline7.totalPrice, 1)) {
        fail(
            `Test 3: originalTotal mismatch — expected ≈${baseline7.totalPrice.toFixed(2)}, got ${seven.durationDiscount.originalTotal.toFixed(2)}`
        );
    }
    if (!seven.breakdown.every(n => n.appliedRules.includes(weekly.name))) {
        fail('Test 3: weekly rule name missing on a night');
    }
    console.log(`  ✓ Test 3 — 7-night = €${seven.totalPrice.toFixed(2)} (~10% off baseline)`);

    // ── 4. + monthly 0.8 @ 28; 30-night picks monthly only ───
    const monthly = await createRule({
        name: 'PRICE-007 smoke Monthly 0.8',
        type: 'DURATION_DISCOUNT',
        multiplier: 0.8,
        minNights: 28,
        propertyId: null
    });
    pricingService.invalidateCache();

    const thirty = await pricingService.quote(PLOVDIV, checkIn7, out30);
    if (thirty.breakdown.some(n => n.appliedRules.includes(weekly.name))) {
        fail('Test 4: weekly rule leaked into a 30-night quote (stacking detected)');
    }
    if (!thirty.breakdown.every(n => n.appliedRules.includes(monthly.name))) {
        fail('Test 4: monthly rule name missing on a night');
    }
    console.log(`  ✓ Test 4 — 30-night picks monthly only (no stacking)`);

    // ── 5. Tie on minNights → lower multiplier wins ───────────
    await createRule({
        name: 'PRICE-007 smoke Weekly 0.85',
        type: 'DURATION_DISCOUNT',
        multiplier: 0.85,
        minNights: 7,
        propertyId: null
    });
    pricingService.invalidateCache();
    const sevenTied = await pricingService.quote(PLOVDIV, checkIn7, out7);
    if (!sevenTied.breakdown.every(n => n.appliedRules.includes('PRICE-007 smoke Weekly 0.85'))) {
        fail('Test 5: tie-break should pick lower multiplier (0.85)');
    }
    console.log(`  ✓ Test 5 — tie-break by multiplier picks 0.85`);

    // Remove the tie rule and the monthly to set up Test 6 cleanly
    await db.pricingRule.deleteMany({
        where: {
            name: { in: ['PRICE-007 smoke Weekly 0.85', 'PRICE-007 smoke Monthly 0.8'] }
        }
    });
    pricingService.invalidateCache();

    // ── 6. Property-scoped 0.9 vs global 0.85 (tied) — lower mult wins ──
    await createRule({
        name: 'PRICE-007 smoke Plovdiv 0.9',
        type: 'DURATION_DISCOUNT',
        multiplier: 0.9,
        minNights: 7,
        propertyId: PLOVDIV
    });
    await createRule({
        name: 'PRICE-007 smoke Global 0.85',
        type: 'DURATION_DISCOUNT',
        multiplier: 0.85,
        minNights: 7,
        propertyId: null
    });
    pricingService.invalidateCache();
    const sevenScope = await pricingService.quote(PLOVDIV, checkIn7, out7);
    if (!sevenScope.breakdown.every(n => n.appliedRules.includes('PRICE-007 smoke Global 0.85'))) {
        fail('Test 6: tie-break by multiplier should win across scopes');
    }
    console.log(`  ✓ Test 6 — tie-break ignores scope, picks lower multiplier`);
    await db.pricingRule.deleteMany({
        where: {
            name: { in: ['PRICE-007 smoke Plovdiv 0.9', 'PRICE-007 smoke Global 0.85'] }
        }
    });
    pricingService.invalidateCache();

    // ── 7. Rule with endDate < checkOut → doesn't apply ──────
    await db.pricingRule.create({
        data: {
            propertyId: null,
            name: 'PRICE-007 smoke NarrowWindow',
            type: 'DURATION_DISCOUNT',
            multiplier: 0.5,
            startDate: new Date('2030-03-04T00:00:00.000Z'),
            endDate: new Date('2030-03-10T00:00:00.000Z'), // BEFORE out7
            isActive: true,
            minNights: 7
        }
    });
    pricingService.invalidateCache();
    const sevenNarrow = await pricingService.quote(PLOVDIV, checkIn7, out7);
    if (sevenNarrow.breakdown.some(n => n.appliedRules.includes('PRICE-007 smoke NarrowWindow'))) {
        fail('Test 7: rule must require strict cover (endDate >= checkOut)');
    }
    console.log(`  ✓ Test 7 — narrow-window rule does not apply (strict cover)`);
    await db.pricingRule.deleteMany({ where: { name: 'PRICE-007 smoke NarrowWindow' } });
    pricingService.invalidateCache();

    // ── 8. Per-night seasonal + DURATION = both apply, no double duration ──
    await createRule({
        name: 'PRICE-007 smoke Seasonal +10%',
        type: 'SEASONAL',
        multiplier: 1.1,
        minNights: null,
        propertyId: null
    });
    pricingService.invalidateCache();
    const sevenCombined = await pricingService.quote(PLOVDIV, checkIn7, out7);
    const everyNight = sevenCombined.breakdown.every(
        n => n.appliedRules.includes('PRICE-007 smoke Seasonal +10%') && n.appliedRules.includes(weekly.name)
    );
    if (!everyNight) fail('Test 8: both seasonal and duration must appear per night');
    const durationCount = sevenCombined.breakdown[0].appliedRules.filter(r => r === weekly.name).length;
    if (durationCount !== 1) fail(`Test 8: duration rule appears ${durationCount}x — should be once`);
    console.log(`  ✓ Test 8 — seasonal + duration both apply, duration not double-applied`);

    // ── 9. Uplift-typed duration rule (multiplier >= 1) never discounts ──
    // Simulates legacy/bad data: createRule writes straight to the DB, bypassing
    // the schema guard that now forbids a DURATION_DISCOUNT with multiplier >= 1.
    // The quote engine must treat it as "no discount" — neither surface a
    // durationDiscount nor raise the price.
    await cleanup();
    pricingService.invalidateCache();
    const baselineForUplift = await pricingService.quote(PLOVDIV, checkIn7, out7);
    await createRule({
        name: 'PRICE-007 smoke Uplift 1.5',
        type: 'DURATION_DISCOUNT',
        multiplier: 1.5,
        minNights: 7,
        propertyId: null
    });
    pricingService.invalidateCache();
    const sevenUplift = await pricingService.quote(PLOVDIV, checkIn7, out7);
    if (sevenUplift.durationDiscount !== null) {
        fail('Test 9: multiplier >= 1 must not surface a durationDiscount');
    }
    if (!approx(sevenUplift.totalPrice, baselineForUplift.totalPrice, 0.01)) {
        fail(
            `Test 9: uplift rule must not change the total — got ${sevenUplift.totalPrice} vs baseline ${baselineForUplift.totalPrice}`
        );
    }
    if (sevenUplift.breakdown.some(n => n.appliedRules.includes('PRICE-007 smoke Uplift 1.5'))) {
        fail('Test 9: uplift rule name must not appear on any night');
    }
    console.log(`  ✓ Test 9 — multiplier >= 1 never discounts or raises price`);

    console.log('\n✓ All PRICE-007 smoke assertions passed');
} finally {
    await cleanup();
    await db.$disconnect();
}
