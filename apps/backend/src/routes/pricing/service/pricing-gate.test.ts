import { describe, it, expect } from 'vitest';
import { evaluateGate, GATE } from './pricing-gate.js';

describe('evaluateGate', () => {
    it('fails below any threshold', () => {
        const r = evaluateGate({ bookings: 10, properties: 2, monthsSpanned: 1 });
        expect(r.met).toBe(false);
        expect(r.reasons.length).toBeGreaterThan(0);
    });

    it('reports every unmet threshold', () => {
        const r = evaluateGate({ bookings: 0, properties: 0, monthsSpanned: 0 });
        expect(r.reasons).toHaveLength(3);
    });

    it('passes when all thresholds are met', () => {
        const r = evaluateGate({
            bookings: GATE.minBookings,
            properties: GATE.minProperties,
            monthsSpanned: GATE.minMonths
        });
        expect(r.met).toBe(true);
        expect(r.reasons).toEqual([]);
    });
});
