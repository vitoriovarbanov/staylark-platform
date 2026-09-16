// Pure v1 fit pipeline, extracted from train-pricing-model-real.ts so it can be
// stress-tested across many data scenarios without a database (see
// src/routes/pricing/service/pricing-trainer-scenarios.test.ts). No I/O.
import { olsFit, rSquared, predict } from './ols.js';
import { percentileToMultiplier, type NightSample } from './pricing-features.js';
import { zFromMultiplier } from '../../src/routes/pricing/service/pricing.math.js';

export const COEFF_KEYS = [
    'intercept',
    'occupancy',
    'lastMinute',
    'weekend',
    'seasonalitySin',
    'seasonalityCos',
    'occupancyLastMinute',
    'occupancyWeekend'
] as const;
export type CoeffKey = (typeof COEFF_KEYS)[number];
export type Coefficients = Record<CoeffKey, number>;

export interface FitOptions {
    shrinkageK: number; // blend weight w = n/(n+k)
    testFraction: number; // newest fraction held out (time-based split)
    ridge: number; // OLS stabiliser
    r2Warn: number; // warn below this held-out R²
}
export const DEFAULT_FIT_OPTIONS: FitOptions = { shrinkageK: 500, testFraction: 0.2, ridge: 1e-4, r2Warn: 0.3 };

export interface FitResult {
    coefficients: Coefficients; // final, blended toward the prior
    realCoefficients: Coefficients; // pre-blend fit (reflects the data directly)
    heldOutR2: number; // NaN when the test split is too small / zero-variance
    blendWeight: number; // w
    trainRows: number;
    testRows: number;
    warnings: string[];
}

/** Thrown when there aren't enough training rows to fit the 8 features. */
export const INSUFFICIENT_TRAINING_ROWS = 'INSUFFICIENT_TRAINING_ROWS';

const toRecord = (arr: number[]): Coefficients =>
    Object.fromEntries(COEFF_KEYS.map((k, i) => [k, arr[i]])) as Coefficients;
const toArray = (c: Coefficients): number[] => COEFF_KEYS.map(k => c[k]);

/**
 * Fit real-data coefficients from per-night samples.
 * `nForBlend` is the count that drives the shrinkage weight (the trainer passes the
 * number of quotes). Throws INSUFFICIENT_TRAINING_ROWS if the train split < 8 rows,
 * and propagates a "Singular matrix" error from OLS when features have no variation.
 */
export function fitRealModel(
    samples: NightSample[],
    prior: Coefficients,
    nForBlend: number,
    options: Partial<FitOptions> = {}
): FitResult {
    const { shrinkageK, testFraction, ridge, r2Warn } = { ...DEFAULT_FIT_OPTIONS, ...options };

    const sorted = [...samples].sort((a, b) => a.sortKey - b.sortKey);
    const splitIdx = Math.floor(sorted.length * (1 - testFraction));
    const trainS = sorted.slice(0, splitIdx);
    const testS = sorted.slice(splitIdx);
    if (trainS.length < 8) throw new Error(INSUFFICIENT_TRAINING_ROWS);

    // Demand model: linear-probability fit of converted ~ features.
    const demandCoeffs = olsFit(
        trainS.map(s => ({ features: s.features, target: s.converted })),
        ridge
    );
    const demandOf = (features: number[]): number => Math.max(0, Math.min(1, predict(features, demandCoeffs)));

    // Policy: rank each row's demand against the TRAIN distribution → target multiplier → target z.
    const trainDemandSorted = trainS.map(s => demandOf(s.features)).sort((a, b) => a - b);
    const rankOf = (d: number): number => {
        if (trainDemandSorted.length === 0) return 0.5;
        let lo = 0;
        let hi = trainDemandSorted.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (trainDemandSorted[mid] <= d) lo = mid + 1;
            else hi = mid;
        }
        return lo / trainDemandSorted.length;
    };
    const targetZ = (features: number[]): number => zFromMultiplier(percentileToMultiplier(rankOf(demandOf(features))));

    // Refit the 8 runtime coefficients on the target z.
    const realArr = olsFit(
        trainS.map(s => ({ features: s.features, target: targetZ(s.features) })),
        ridge
    );

    const heldOutR2 =
        testS.length >= 2
            ? rSquared(
                  testS.map(s => ({ features: s.features, target: targetZ(s.features) })),
                  realArr
              )
            : NaN;

    // Shrinkage-blend toward the prior.
    const priorArr = toArray(prior);
    const blendWeight = nForBlend / (nForBlend + shrinkageK);
    const finalArr = realArr.map((c, i) => blendWeight * c + (1 - blendWeight) * priorArr[i]);

    const coefficients = toRecord(finalArr);
    const realCoefficients = toRecord(realArr);

    const warnings: string[] = [];
    if (coefficients.occupancy <= 0) warnings.push('occupancy coefficient should be > 0');
    if (coefficients.lastMinute >= 0) warnings.push('lastMinute coefficient should be < 0');
    if (coefficients.weekend <= 0) warnings.push('weekend coefficient should be > 0');
    if (!Number.isNaN(heldOutR2) && heldOutR2 < r2Warn) warnings.push(`held-out R² ${heldOutR2.toFixed(3)} is low`);
    if (Number.isNaN(heldOutR2)) warnings.push('held-out R² is undefined (too few / zero-variance test rows)');

    return {
        coefficients,
        realCoefficients,
        heldOutR2,
        blendWeight,
        trainRows: trainS.length,
        testRows: testS.length,
        warnings
    };
}
