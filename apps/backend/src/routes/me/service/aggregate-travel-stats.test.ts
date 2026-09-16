import { describe, it, expect } from 'vitest';
import { aggregateTravelStats } from './aggregate-travel-stats.js';

const stay = (city: string, checkIn: string, checkOut: string) => ({
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    property: { city }
});

describe('aggregateTravelStats', () => {
    it('returns zeros for no stays', () => {
        expect(aggregateTravelStats([])).toEqual({
            countries: 0,
            cities: 0,
            nights: 0,
            perCountry: [],
            journey: []
        });
    });

    it('counts nights as date difference', () => {
        const r = aggregateTravelStats([stay('Sofia', '2026-01-01', '2026-01-05')]);
        expect(r.nights).toBe(4);
        expect(r.cities).toBe(1);
        expect(r.countries).toBe(1);
    });

    it('keeps a single country rich: one country, multiple cities', () => {
        const r = aggregateTravelStats([
            stay('Sofia', '2026-01-01', '2026-01-03'),
            stay('Lisbon', '2026-02-01', '2026-02-02') // different country
        ]);
        expect(r.countries).toBe(2);
        expect(r.cities).toBe(2);
    });

    it('merges repeat stays in the same city and keeps the latest lastStay', () => {
        const r = aggregateTravelStats([
            stay('Sofia', '2026-01-01', '2026-01-03'),
            stay('Sofia', '2026-03-01', '2026-03-04')
        ]);
        expect(r.cities).toBe(1);
        expect(r.journey).toHaveLength(1);
        expect(r.journey[0]).toMatchObject({ city: 'Sofia', nights: 5 });
        expect(r.journey[0].lastStay).toBe(new Date('2026-03-04').toISOString());
    });

    it('buckets unknown cities under Other', () => {
        const r = aggregateTravelStats([stay('Atlantis', '2026-01-01', '2026-01-02')]);
        expect(r.perCountry[0]).toMatchObject({ country: 'Other', flag: '🌍', cities: 1 });
    });
});
