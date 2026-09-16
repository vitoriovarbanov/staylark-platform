import { describe, it, expect } from 'vitest';
import { multiplierFromZ, zFromMultiplier } from './pricing.math.js';

describe('zFromMultiplier', () => {
    it('round-trips with multiplierFromZ across the band', () => {
        for (const m of [0.65, 0.8, 1.0, 1.2, 1.5, 1.75]) {
            expect(multiplierFromZ(zFromMultiplier(m))).toBeCloseTo(m, 9);
        }
    });

    it('clamps the bounds to a finite z (no ±Infinity)', () => {
        expect(Number.isFinite(zFromMultiplier(0.6))).toBe(true);
        expect(Number.isFinite(zFromMultiplier(1.8))).toBe(true);
        expect(Number.isFinite(zFromMultiplier(0))).toBe(true);
        expect(Number.isFinite(zFromMultiplier(5))).toBe(true);
    });
});
