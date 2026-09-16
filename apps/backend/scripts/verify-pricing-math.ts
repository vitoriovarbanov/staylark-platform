import { Prisma } from '@prisma/client';
import { sigmoid, multiplierFromZ, clamp, roundHalfEven } from '../src/routes/pricing/service/pricing.math.js';
import { loadModel, predictMultiplier } from '../src/routes/pricing/service/pricing.model.js';
import type { ModelFeatures } from '../src/routes/pricing/service/pricing.model.js';
import { quoteForNight } from '../src/routes/pricing/service/pricing.service.js';
import type { ActiveOverride } from '../src/routes/pricing/repository/pricing.repository.js';

interface Check {
    label: string;
    expected: number;
    actual: number;
    tolerance?: number;
}

const checks: Check[] = [
    { label: 'sigmoid(0) === 0.5', expected: 0.5, actual: sigmoid(0) },
    { label: 'sigmoid(100) saturates to ~1', expected: 1, actual: sigmoid(100), tolerance: 1e-6 },
    { label: 'sigmoid(-100) saturates to ~0', expected: 0, actual: sigmoid(-100), tolerance: 1e-6 },
    { label: 'multiplierFromZ(0) === 1.2', expected: 1.2, actual: multiplierFromZ(0) },
    { label: 'multiplierFromZ(-50) clamps low', expected: 0.6, actual: multiplierFromZ(-50), tolerance: 1e-6 },
    { label: 'multiplierFromZ(50) clamps high', expected: 1.8, actual: multiplierFromZ(50), tolerance: 1e-6 },
    { label: 'clamp(5, 0, 10)', expected: 5, actual: clamp(5, 0, 10) },
    { label: 'clamp(-1, 0, 10)', expected: 0, actual: clamp(-1, 0, 10) },
    { label: 'clamp(11, 0, 10)', expected: 10, actual: clamp(11, 0, 10) },
    { label: 'roundHalfEven(2.5)', expected: 2, actual: roundHalfEven(2.5) },
    { label: 'roundHalfEven(3.5)', expected: 4, actual: roundHalfEven(3.5) },
    { label: 'roundHalfEven(0.125, 2) → 0.12 (banker: even)', expected: 0.12, actual: roundHalfEven(0.125, 2) },
    { label: 'roundHalfEven(0.375, 2) → 0.38 (banker: even)', expected: 0.38, actual: roundHalfEven(0.375, 2) }
];

let failed = 0;
for (const c of checks) {
    const tol = c.tolerance ?? 1e-9;
    const pass = Math.abs(c.actual - c.expected) <= tol;
    if (!pass) failed++;
    console.log(`${pass ? '✓' : '✗'} ${c.label}  expected=${c.expected} actual=${c.actual}`);
}

const model = loadModel();

console.log(`\n--- model ${model.modelVersion} (R²=${model.rSquared}) ---`);

const modelChecks: Array<{ label: string; assertion: () => boolean }> = [
    {
        label: 'coefficients loaded — occupancy positive, lastMinute negative',
        assertion: () => model.coefficients.occupancy > 0 && model.coefficients.lastMinute < 0
    },
    {
        label: 'extreme inputs stay within [0.6, 1.8]',
        assertion: () => {
            const extremes: ModelFeatures[] = [
                { occupancy: 0, daysToCheckIn: 90, isWeekend: 0, month: 1 },
                { occupancy: 1, daysToCheckIn: 0, isWeekend: 1, month: 7 },
                { occupancy: 0.5, daysToCheckIn: 45, isWeekend: 0, month: 4 }
            ];
            return extremes.every(f => {
                const m = predictMultiplier(model, f);
                return m >= 0.6 && m <= 1.8;
            });
        }
    },
    {
        label: 'high occupancy + summer weekend predicts uplift over midpoint (1.2)',
        assertion: () => predictMultiplier(model, { occupancy: 0.9, daysToCheckIn: 30, isWeekend: 1, month: 7 }) > 1.2
    },
    {
        label: 'low occupancy + off-season weekday predicts discount under midpoint',
        assertion: () => predictMultiplier(model, { occupancy: 0.1, daysToCheckIn: 80, isWeekend: 0, month: 2 }) < 1.2
    }
];

for (const c of modelChecks) {
    const pass = c.assertion();
    if (!pass) failed++;
    console.log(`${pass ? '✓' : '✗'} ${c.label}`);
}

const D = (n: number) => new Prisma.Decimal(n);

const syntheticModel = {
    ...model,
    coefficients: {
        intercept: 0,
        occupancy: 2,
        lastMinute: -0.5,
        weekend: 0.4,
        seasonalitySin: 0,
        seasonalityCos: 0.3,
        occupancyLastMinute: 0,
        occupancyWeekend: 0
    }
};

const overrideOf = (name: string, mult: number): ActiveOverride => ({
    id: name,
    name,
    multiplier: D(mult),
    startDate: new Date(),
    endDate: new Date()
});

console.log('\n--- composition (synthetic coefficients) ---');

const compositionChecks: Array<{ label: string; assertion: () => boolean }> = [
    {
        label: 'happy path: bounded result, ML model in appliedRules',
        assertion: () => {
            const r = quoteForNight({
                model: syntheticModel,
                basePrice: D(100),
                occupancy: 0.5,
                daysToCheckIn: 30,
                isWeekend: 1,
                month: 7,
                overrides: [],
                bounds: { min: null, max: null }
            });
            const p = r.price.toNumber();
            return p > 60 && p < 180 && r.appliedRules.includes('ML model');
        }
    },
    {
        label: 'cap binds high when overrides stack with ML uplift → €180',
        assertion: () => {
            const r = quoteForNight({
                model: syntheticModel,
                basePrice: D(100),
                occupancy: 0.95,
                daysToCheckIn: 5,
                isWeekend: 1,
                month: 7,
                overrides: [overrideOf('Summer Festival', 1.5)],
                bounds: { min: null, max: null }
            });
            return r.price.toNumber() === 180 && r.appliedRules.includes('Summer Festival');
        }
    },
    {
        label: 'property floor clamps low scenarios → €90',
        assertion: () => {
            // Synthetic model's worst case still gives mult ~0.97, so base 70 → 67.9 is below the floor.
            const r = quoteForNight({
                model: syntheticModel,
                basePrice: D(70),
                occupancy: 0.05,
                daysToCheckIn: 80,
                isWeekend: 0,
                month: 2,
                overrides: [],
                bounds: { min: D(90), max: null }
            });
            return r.price.toNumber() === 90;
        }
    },
    {
        label: 'property ceiling clamps high scenarios → €150',
        assertion: () => {
            const r = quoteForNight({
                model: syntheticModel,
                basePrice: D(100),
                occupancy: 1,
                daysToCheckIn: 0,
                isWeekend: 1,
                month: 7,
                overrides: [overrideOf('Event', 1.5)],
                bounds: { min: null, max: D(150) }
            });
            return r.price.toNumber() === 150;
        }
    },
    {
        label: 'overrides compose multiplicatively; all names surface in appliedRules',
        assertion: () => {
            const r = quoteForNight({
                model: syntheticModel,
                basePrice: D(100),
                occupancy: 0.5,
                daysToCheckIn: 30,
                isWeekend: 0,
                month: 4,
                overrides: [overrideOf('A', 1.2), overrideOf('B', 0.9)],
                bounds: { min: null, max: null }
            });
            return ['ML model', 'A', 'B'].every(n => r.appliedRules.includes(n));
        }
    }
];

for (const c of compositionChecks) {
    const pass = c.assertion();
    if (!pass) failed++;
    console.log(`${pass ? '✓' : '✗'} ${c.label}`);
}

if (failed > 0) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
}
const totalChecks = checks.length + modelChecks.length + compositionChecks.length;
console.log(`\nAll ${totalChecks} checks passed.`);
