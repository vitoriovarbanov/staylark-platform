// Stress tests for the v1 real-data fit pipeline (scripts/lib/fit-real-model.ts).
// Generates many synthetic demand scenarios — strong/weak/reversed/no signal,
// degenerate data, varying volume — and asserts the trainer stays correct and,
// above all, SAFE (never emits NaN/out-of-bounds coefficients). This is the
// standing confidence that a real run in a few months behaves sanely.
import { describe, it, expect } from 'vitest';
import {
    fitRealModel,
    COEFF_KEYS,
    INSUFFICIENT_TRAINING_ROWS,
    type Coefficients
} from '../../../../scripts/lib/fit-real-model.js';
import { featureRow, type NightSample } from '../../../../scripts/lib/pricing-features.js';
import { predictMultiplier, type PricingModel } from './pricing.model.js';

const PRIOR: Coefficients = {
    intercept: -1.06,
    occupancy: 0.84,
    lastMinute: -0.36,
    weekend: 0.39,
    seasonalitySin: -0.3,
    seasonalityCos: -0.52,
    occupancyLastMinute: 0.04,
    occupancyWeekend: -0.01
};

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface PatternInputs {
    occupancy: number;
    lm: number; // last-minute score in [0,1]
    weekend: number; // 0 | 1
    season: number; // sin(2π·month/12)
}

/** Build n per-night samples whose `converted` is drawn from an injected demand logit. */
function makeSamples(n: number, patternZ: (p: PatternInputs) => number, seed: number): NightSample[] {
    const rng = mulberry32(seed);
    const out: NightSample[] = [];
    for (let i = 0; i < n; i++) {
        const occupancy = rng();
        const daysToCheckIn = Math.floor(rng() * 90);
        const isWeekend = rng() < 2 / 7 ? 1 : 0;
        const month = 1 + Math.floor(rng() * 12);
        const lm = Math.max(0, 1 - daysToCheckIn / 90);
        const season = Math.sin((2 * Math.PI * month) / 12);
        const p = 1 / (1 + Math.exp(-patternZ({ occupancy, lm, weekend: isWeekend, season })));
        out.push({
            features: featureRow(occupancy, daysToCheckIn, isWeekend, month),
            converted: rng() < p ? 1 : 0,
            sortKey: i
        });
    }
    return out;
}

/** The core safety invariant: coefficients are finite AND every price stays in [0.6,1.8]. */
function assertSaneModel(coeffs: Coefficients): void {
    for (const k of COEFF_KEYS) expect(Number.isFinite(coeffs[k]), `${k} finite`).toBe(true);
    const model: PricingModel = {
        modelVersion: 't',
        trainedAt: 't',
        dataSource: 'real',
        rngSeed: null,
        rSquared: 0,
        coefficients: coeffs
    };
    for (const occupancy of [0, 0.25, 0.5, 0.75, 1]) {
        for (const daysToCheckIn of [0, 30, 60, 90]) {
            for (const isWeekend of [0, 1] as const) {
                for (const month of [1, 4, 7, 10]) {
                    const m = predictMultiplier(model, { occupancy, daysToCheckIn, isWeekend, month });
                    expect(m).toBeGreaterThanOrEqual(0.6 - 1e-9);
                    expect(m).toBeLessThanOrEqual(1.8 + 1e-9);
                }
            }
        }
    }
}

const canonical = (p: PatternInputs) => -0.3 + 2.5 * p.occupancy + 0.8 * p.weekend - 1.8 * p.lm + 0.5 * p.season;

describe('trainer scenarios — signal recovery', () => {
    it('recovers the canonical signs (occupancy>0, weekend>0, lastMinute<0) and fits well', () => {
        const r = fitRealModel(makeSamples(2000, canonical, 1), PRIOR, 2000);
        expect(r.realCoefficients.occupancy).toBeGreaterThan(0);
        expect(r.realCoefficients.weekend).toBeGreaterThan(0);
        expect(r.realCoefficients.lastMinute).toBeLessThan(0);
        expect(r.heldOutR2).toBeGreaterThan(0.3);
        assertSaneModel(r.coefficients);
    });

    it('recovers a REVERSED pattern (proves it learns direction, not hardcoded signs)', () => {
        const r = fitRealModel(
            makeSamples(2000, p => -canonical(p), 2),
            PRIOR,
            2000
        );
        expect(r.realCoefficients.occupancy).toBeLessThan(0);
        expect(r.realCoefficients.weekend).toBeLessThan(0);
        expect(r.realCoefficients.lastMinute).toBeGreaterThan(0);
        assertSaneModel(r.coefficients);
    });

    it('produces a sane model on pure noise (no signal)', () => {
        const r = fitRealModel(
            makeSamples(1500, () => 0, 3),
            PRIOR,
            1500
        );
        assertSaneModel(r.coefficients);
    });
});

describe('trainer scenarios — shrinkage blend', () => {
    it('blend weight follows w = n/(n+k) and low volume stays near the prior', () => {
        const samples = makeSamples(2000, canonical, 4);
        const low = fitRealModel(samples, PRIOR, 50);
        const high = fitRealModel(samples, PRIOR, 5000);

        expect(low.blendWeight).toBeCloseTo(50 / 550, 6);
        expect(high.blendWeight).toBeCloseTo(5000 / 5500, 6);

        const dist = (c: Coefficients) => COEFF_KEYS.reduce((s, k) => s + (c[k] - PRIOR[k]) ** 2, 0);
        // More data ⇒ trusts the real fit more ⇒ further from the prior.
        expect(dist(high.coefficients)).toBeGreaterThan(dist(low.coefficients));
        assertSaneModel(low.coefficients);
        assertSaneModel(high.coefficients);
    });
});

describe('trainer scenarios — degenerate data', () => {
    it('handles all-converted without crashing or going out of bounds', () => {
        const r = fitRealModel(
            makeSamples(1500, () => 100, 5),
            PRIOR,
            1500
        );
        assertSaneModel(r.coefficients);
    });

    it('handles none-converted without crashing or going out of bounds', () => {
        const r = fitRealModel(
            makeSamples(1500, () => -100, 6),
            PRIOR,
            1500
        );
        assertSaneModel(r.coefficients);
    });

    it('throws INSUFFICIENT_TRAINING_ROWS below 8 train rows', () => {
        expect(() => fitRealModel(makeSamples(5, canonical, 7), PRIOR, 5)).toThrow(INSUFFICIENT_TRAINING_ROWS);
    });

    it('throws Singular matrix when features have zero variation and no ridge', () => {
        const identical: NightSample[] = Array.from({ length: 50 }, (_, i) => ({
            features: featureRow(0.5, 30, 1, 6),
            converted: i % 2,
            sortKey: i
        }));
        expect(() => fitRealModel(identical, PRIOR, 50, { ridge: 0 })).toThrow(/Singular/);
    });
});

describe('trainer scenarios — determinism', () => {
    it('is deterministic for identical input', () => {
        const samples = makeSamples(1000, canonical, 8);
        const a = fitRealModel(samples, PRIOR, 1000);
        const b = fitRealModel(samples, PRIOR, 1000);
        expect(a.coefficients).toEqual(b.coefficients);
        expect(a.heldOutR2).toBe(b.heldOutR2);
    });
});

describe('trainer scenarios — fuzz (safety invariant across random patterns)', () => {
    it('never emits NaN/out-of-bounds coefficients for 20 random demand patterns', () => {
        for (let t = 0; t < 20; t++) {
            const rng = mulberry32(1000 + t);
            // Random linear demand logit over the features, random volume.
            const wOcc = (rng() - 0.5) * 8;
            const wWe = (rng() - 0.5) * 4;
            const wLm = (rng() - 0.5) * 6;
            const wSeason = (rng() - 0.5) * 3;
            const bias = (rng() - 0.5) * 2;
            const n = 200 + Math.floor(rng() * 1300);
            const pattern = (p: PatternInputs) =>
                bias + wOcc * p.occupancy + wWe * p.weekend + wLm * p.lm + wSeason * p.season;
            const r = fitRealModel(makeSamples(n, pattern, 5000 + t), PRIOR, n);
            assertSaneModel(r.coefficients);
            assertSaneModel(r.realCoefficients);
        }
    });
});
