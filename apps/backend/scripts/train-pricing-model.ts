import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LAST_MINUTE_HORIZON_DAYS } from '../src/routes/pricing/service/pricing.config.js';
import { olsFit, rSquared, type Row } from './lib/ols.js';

const RNG_SEED = 42;
const N_ROWS = 50_000;
const TEST_FRACTION = 0.2;
const R2_THRESHOLD = 0.84;

// Mulberry32 — deterministic, no deps.
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

const rand = mulberry32(RNG_SEED);
const gauss = (): number => {
    // Box–Muller
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const seasonalityFactor = (month: number): number => {
    // Summer peak (Jul = 7), winter trough (Jan = 1). Range ~ [-1, 1].
    return Math.sin(((month - 4) * Math.PI) / 6);
};

function buildRow(): Row {
    const occupancy = rand();
    const daysToCheckIn = Math.floor(rand() * LAST_MINUTE_HORIZON_DAYS);
    const isWeekend = rand() < 2 / 7 ? 1 : 0;
    const month = 1 + Math.floor(rand() * 12);

    const highOcc = 1 + (0.2 * Math.max(0, occupancy - 0.8)) / 0.2;
    const lowOcc = 1 - (0.15 * Math.max(0, 0.3 - occupancy)) / 0.3;
    const lm = 1 - 0.1 * (daysToCheckIn < 14 ? 1 : 0);
    const we = 1 + 0.1 * isWeekend;
    const season = 1 + 0.15 * seasonalityFactor(month);

    const observed = highOcc * lowOcc * lm * we * season * (1 + 0.03 * gauss());
    // Invert sigmoid mapping: solve multiplierFromZ(z) = observed for z.
    const clamped = Math.max(0.601, Math.min(1.799, observed));
    const t = (clamped - 0.6) / 1.2;
    const z = Math.log(t / (1 - t));

    const lastMinuteScore = Math.max(0, 1 - daysToCheckIn / LAST_MINUTE_HORIZON_DAYS);
    const sin = Math.sin((2 * Math.PI * month) / 12);
    const cos = Math.cos((2 * Math.PI * month) / 12);

    return {
        features: [
            1, // intercept
            occupancy,
            lastMinuteScore,
            isWeekend,
            sin,
            cos,
            occupancy * lastMinuteScore,
            occupancy * isWeekend
        ],
        target: z
    };
}

const allRows: Row[] = Array.from({ length: N_ROWS }, buildRow);
const split = Math.floor(N_ROWS * (1 - TEST_FRACTION));
const train = allRows.slice(0, split);
const test = allRows.slice(split);

const coeffs = olsFit(train);
const r2 = rSquared(test, coeffs);

if (r2 < R2_THRESHOLD) {
    console.error(`R² = ${r2.toFixed(4)} below threshold ${R2_THRESHOLD}. Aborting.`);
    process.exit(1);
}

const model = {
    modelVersion: `${new Date().toISOString().split('T')[0]}-v1`,
    trainedAt: new Date().toISOString(),
    dataSource: 'synthetic' as const,
    rngSeed: RNG_SEED,
    rSquared: Number(r2.toFixed(4)),
    coefficients: {
        intercept: coeffs[0],
        occupancy: coeffs[1],
        lastMinute: coeffs[2],
        weekend: coeffs[3],
        seasonalitySin: coeffs[4],
        seasonalityCos: coeffs[5],
        occupancyLastMinute: coeffs[6],
        occupancyWeekend: coeffs[7]
    }
};

const out = resolve(import.meta.dirname, '..', 'prisma', 'pricing-model.json');
writeFileSync(out, JSON.stringify(model, null, 2) + '\n');
console.log(`Wrote ${out} (R² = ${r2.toFixed(4)})`);
