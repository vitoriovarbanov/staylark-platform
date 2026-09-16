import { MIN_MULTIPLIER, MAX_MULTIPLIER } from './pricing.config.js';

export const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

export const multiplierFromZ = (z: number): number => MIN_MULTIPLIER + (MAX_MULTIPLIER - MIN_MULTIPLIER) * sigmoid(z);

/**
 * Inverse of `multiplierFromZ`: recover the latent z that yields multiplier `m`.
 * Used by the trainers to turn a target multiplier into a regression target. The
 * input is clamped just inside the open bounds so the logit never returns ±Infinity.
 */
export const zFromMultiplier = (m: number): number => {
    const t = clamp((m - MIN_MULTIPLIER) / (MAX_MULTIPLIER - MIN_MULTIPLIER), 1e-6, 1 - 1e-6);
    return Math.log(t / (1 - t));
};

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const roundHalfEven = (value: number, decimals = 0): number => {
    const factor = 10 ** decimals;
    const scaled = value * factor;
    const floor = Math.floor(scaled);
    const diff = scaled - floor;
    if (diff < 0.5) return floor / factor;
    if (diff > 0.5) return (floor + 1) / factor;
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
};
