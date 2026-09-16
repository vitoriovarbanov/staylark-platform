import { describe, it, expect } from 'vitest';
import { featureRow, percentileToMultiplier, quoteToNights } from '../../../../scripts/lib/pricing-features.js';
import { predict } from '../../../../scripts/lib/ols.js';
import { predictMultiplier, type PricingModel } from './pricing.model.js';
import { multiplierFromZ } from './pricing.math.js';

const model: PricingModel = {
    modelVersion: 't',
    trainedAt: 't',
    dataSource: 'synthetic',
    rngSeed: 42,
    rSquared: 0,
    coefficients: {
        intercept: -1.06,
        occupancy: 0.84,
        lastMinute: -0.36,
        weekend: 0.39,
        seasonalitySin: -0.3,
        seasonalityCos: -0.52,
        occupancyLastMinute: 0.04,
        occupancyWeekend: -0.01
    }
};
const coeffArr = [
    model.coefficients.intercept,
    model.coefficients.occupancy,
    model.coefficients.lastMinute,
    model.coefficients.weekend,
    model.coefficients.seasonalitySin,
    model.coefficients.seasonalityCos,
    model.coefficients.occupancyLastMinute,
    model.coefficients.occupancyWeekend
];

describe('featureRow parity with the runtime predictMultiplier', () => {
    const cases = [
        { occupancy: 0.5, daysToCheckIn: 10, isWeekend: 1, month: 7 },
        { occupancy: 0.9, daysToCheckIn: 80, isWeekend: 0, month: 1 },
        { occupancy: 0.2, daysToCheckIn: 0, isWeekend: 0, month: 12 }
    ];
    for (const c of cases) {
        it(`matches for ${JSON.stringify(c)}`, () => {
            const z = predict(featureRow(c.occupancy, c.daysToCheckIn, c.isWeekend, c.month), coeffArr);
            expect(multiplierFromZ(z)).toBeCloseTo(predictMultiplier(model, c), 10);
        });
    }
});

describe('percentileToMultiplier', () => {
    it('anchors 0→0.6, 0.5→1.0, 1→1.8', () => {
        expect(percentileToMultiplier(0)).toBeCloseTo(0.6, 9);
        expect(percentileToMultiplier(0.5)).toBeCloseTo(1.0, 9);
        expect(percentileToMultiplier(1)).toBeCloseTo(1.8, 9);
    });

    it('is monotonic and bounded to [0.6, 1.8]', () => {
        let prev = -Infinity;
        for (let r = 0; r <= 1.0001; r += 0.05) {
            const m = percentileToMultiplier(r);
            expect(m).toBeGreaterThanOrEqual(prev - 1e-9);
            expect(m).toBeGreaterThanOrEqual(0.6 - 1e-9);
            expect(m).toBeLessThanOrEqual(1.8 + 1e-9);
            prev = m;
        }
    });
});

describe('quoteToNights', () => {
    it('emits one leakage-safe sample per night', () => {
        const nights = quoteToNights({
            checkIn: new Date('2026-07-10'),
            checkOut: new Date('2026-07-13'),
            createdAt: new Date('2026-07-01'),
            occupancy: 0.5,
            converted: true
        });
        expect(nights).toHaveLength(3); // 10,11,12
        for (const n of nights) {
            expect(n.features).toHaveLength(8);
            expect(n.converted).toBe(1);
            // daysToCheckIn (feature index 2 = lastMinute) reflects createdAt anchor, in [0,1]
            expect(n.features[2]).toBeGreaterThanOrEqual(0);
            expect(n.features[2]).toBeLessThanOrEqual(1);
        }
    });
});
