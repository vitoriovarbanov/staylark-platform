import { describe, it, expect } from 'vitest';
import { toAvailabilityStatuses } from './availability-status.js';

describe('toAvailabilityStatuses', () => {
    it('marks a property BOOKED when it is booked tonight, AVAILABLE otherwise', () => {
        const result = toAvailabilityStatuses(['a', 'b', 'c'], new Set(['b']));
        expect(result).toEqual([
            { id: 'a', status: 'AVAILABLE' },
            { id: 'b', status: 'BOOKED' },
            { id: 'c', status: 'AVAILABLE' }
        ]);
    });

    it('preserves the requested id order and returns one entry per requested id', () => {
        const result = toAvailabilityStatuses(['c', 'a', 'b'], new Set(['a', 'c']));
        expect(result.map(r => r.id)).toEqual(['c', 'a', 'b']);
        expect(result).toHaveLength(3);
    });

    it('returns an empty array when no ids are requested', () => {
        expect(toAvailabilityStatuses([], new Set(['a']))).toEqual([]);
    });

    it('reports AVAILABLE for every id when nothing is booked', () => {
        const result = toAvailabilityStatuses(['a', 'b'], new Set());
        expect(result.every(r => r.status === 'AVAILABLE')).toBe(true);
    });
});
