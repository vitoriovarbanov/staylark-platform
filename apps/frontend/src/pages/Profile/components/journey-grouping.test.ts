import { describe, it, expect } from 'vitest';
import { countryCount, groupJourneyByCountry } from './journey-grouping';
import type { JourneyStop } from '@staylark/contract';

const stop = (city: string, nights: number): JourneyStop => ({
    city,
    nights,
    lastStay: '2026-01-01T00:00:00.000Z'
});

describe('countryCount', () => {
    it('counts distinct countries (Bulgarian cities collapse to one)', () => {
        expect(countryCount([stop('Sofia', 5), stop('Plovdiv', 3), stop('Varna', 2)])).toBe(1);
    });

    it('counts multiple countries', () => {
        expect(countryCount([stop('Sofia', 5), stop('Paris', 3), stop('Athens', 2)])).toBe(3);
    });

    it('is zero for an empty journey', () => {
        expect(countryCount([])).toBe(0);
    });
});

describe('groupJourneyByCountry', () => {
    it('groups cities under their country and sums nights', () => {
        const groups = groupJourneyByCountry(
            [stop('Sofia', 30), stop('Paris', 9), stop('Lyon', 4), stop('Plovdiv', 8)],
            'Sofia'
        );
        const bg = groups.find(g => g.country === 'Bulgaria')!;
        expect(bg.flag).toBe('🇧🇬');
        expect(bg.nights).toBe(38);
        expect(bg.cities.map(c => c.city)).toEqual(['Sofia', 'Plovdiv']);
    });

    it('orders countries by total nights descending', () => {
        const groups = groupJourneyByCountry([stop('Paris', 3), stop('Sofia', 30), stop('Athens', 5)], null);
        expect(groups.map(g => g.country)).toEqual(['Bulgaria', 'Greece', 'France']);
    });

    it('puts the home city first within its country and flags it', () => {
        const groups = groupJourneyByCountry([stop('Plovdiv', 20), stop('Sofia', 5)], 'Sofia');
        const bg = groups[0];
        expect(bg.cities[0]).toMatchObject({ city: 'Sofia', isHome: true });
        expect(bg.cities[1]).toMatchObject({ city: 'Plovdiv', isHome: false });
    });
});
