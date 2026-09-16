import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { multiplierFromZ } from './pricing.math.js';
import { LAST_MINUTE_HORIZON_DAYS } from './pricing.config.js';

export interface PricingModel {
    modelVersion: string;
    trainedAt: string;
    dataSource: 'synthetic' | 'real';
    rngSeed: number | null;
    rSquared: number;
    coefficients: {
        intercept: number;
        occupancy: number;
        lastMinute: number;
        weekend: number;
        seasonalitySin: number;
        seasonalityCos: number;
        occupancyLastMinute: number;
        occupancyWeekend: number;
    };
}

export interface ModelFeatures {
    occupancy: number; // [0, 1]
    daysToCheckIn: number; // ≥ 0
    isWeekend: 0 | 1;
    month: number; // 1..12
}

// Resolve from the working directory (always `apps/backend` — `tsx` in dev, Dockerfile
// `WORKDIR /app/apps/backend` in prod), NOT from `import.meta.dirname`: tsup bundles this
// module into `dist/server.js`, so the old source-relative `../../../../prisma` path
// overshot to the filesystem root in production (`/prisma/pricing-model.json` → ENOENT).
const MODEL_PATH = resolve(process.cwd(), 'prisma', 'pricing-model.json');

let cached: PricingModel | null = null;

export const loadModel = (): PricingModel => {
    if (cached) return cached;
    const raw = readFileSync(MODEL_PATH, 'utf8');
    const parsed = JSON.parse(raw) as PricingModel;
    // Fail safe: a legacy/hand-edited model file may predate the dataSource field.
    // Anything not explicitly 'real' is treated as synthetic so downstream (the
    // admin metadata + banner) never reads undefined and mislabels the model.
    if (parsed.dataSource !== 'real') parsed.dataSource = 'synthetic';
    cached = parsed;
    return cached;
};

export const predictMultiplier = (model: PricingModel, f: ModelFeatures): number => {
    const c = model.coefficients;
    const occ = Math.max(0, Math.min(1, f.occupancy));
    const lm = Math.max(0, 1 - f.daysToCheckIn / LAST_MINUTE_HORIZON_DAYS);
    const we = f.isWeekend ? 1 : 0;
    const sin = Math.sin((2 * Math.PI * f.month) / 12);
    const cos = Math.cos((2 * Math.PI * f.month) / 12);

    const z =
        c.intercept +
        c.occupancy * occ +
        c.lastMinute * lm +
        c.weekend * we +
        c.seasonalitySin * sin +
        c.seasonalityCos * cos +
        c.occupancyLastMinute * occ * lm +
        c.occupancyWeekend * occ * we;

    return multiplierFromZ(z);
};
