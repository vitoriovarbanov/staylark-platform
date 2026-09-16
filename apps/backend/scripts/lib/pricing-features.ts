import {
    LAST_MINUTE_HORIZON_DAYS,
    MIN_MULTIPLIER,
    MAX_MULTIPLIER
} from '../../src/routes/pricing/service/pricing.config.js';

// Neutral multiplier — median demand maps here. Midpoint of the bounds is 1.2, but
// 1.0 (base price) is the intuitive "no adjustment" point, so the policy centres there.
const NEUTRAL_MULTIPLIER = 1.0;

/**
 * The 8-feature vector, kept byte-identical to the transforms inside
 * `predictMultiplier` (pricing.model.ts) so training and serving can never drift.
 * Order: [intercept, occupancy, lastMinute, weekend, seasonalitySin, seasonalityCos,
 * occupancy*lastMinute, occupancy*weekend].
 */
export const featureRow = (occupancy: number, daysToCheckIn: number, isWeekend: number, month: number): number[] => {
    const occ = Math.max(0, Math.min(1, occupancy));
    const lm = Math.max(0, 1 - daysToCheckIn / LAST_MINUTE_HORIZON_DAYS);
    const we = isWeekend ? 1 : 0;
    const sin = Math.sin((2 * Math.PI * month) / 12);
    const cos = Math.cos((2 * Math.PI * month) / 12);
    return [1, occ, lm, we, sin, cos, occ * lm, occ * we];
};

export interface QuoteRow {
    checkIn: Date;
    checkOut: Date;
    createdAt: Date;
    occupancy: number;
    converted: boolean;
}

export interface NightSample {
    features: number[];
    converted: number; // 0 | 1
    sortKey: number; // createdAt ms — for the time-based train/test split
}

/**
 * Explode a quote into one sample per night, deriving the same per-night features the
 * runtime computed. `daysToCheckIn` is anchored on `createdAt` (quote time), so every
 * feature reflects only what was known when the price was shown — no leakage. The
 * `occupancy` snapshot is shared across the stay's nights (the runtime computes it once).
 */
export const quoteToNights = (q: QuoteRow): NightSample[] => {
    const out: NightSample[] = [];
    const cursor = new Date(q.checkIn);
    const end = new Date(q.checkOut);
    const createdMs = q.createdAt.getTime();
    while (cursor < end) {
        const daysToCheckIn = Math.max(0, Math.floor((cursor.getTime() - createdMs) / 86_400_000));
        const dow = cursor.getUTCDay();
        const isWeekend = dow === 5 || dow === 6 ? 1 : 0;
        const month = cursor.getUTCMonth() + 1;
        out.push({
            features: featureRow(q.occupancy, daysToCheckIn, isWeekend, month),
            converted: q.converted ? 1 : 0,
            sortKey: createdMs
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
};

/**
 * Policy: map a demand percentile rank in [0,1] to a target multiplier. Median demand
 * (rank 0.5) → the neutral 1.0; higher demand toward MAX, lower toward MIN. Monotonic
 * and bounded to [MIN_MULTIPLIER, MAX_MULTIPLIER]. This is a documented business knob —
 * the percentile shape is deliberately simple and robust at low volume; tune it
 * deliberately, not silently.
 */
export const percentileToMultiplier = (rank: number): number => {
    const r = Math.max(0, Math.min(1, rank));
    return r <= 0.5
        ? MIN_MULTIPLIER + (NEUTRAL_MULTIPLIER - MIN_MULTIPLIER) * (r / 0.5)
        : NEUTRAL_MULTIPLIER + (MAX_MULTIPLIER - NEUTRAL_MULTIPLIER) * ((r - 0.5) / 0.5);
};
