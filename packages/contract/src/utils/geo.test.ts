import { describe, it, expect } from 'vitest';
import { lookupCityGeo, CITY_COUNTRY } from './geo.js';

describe('lookupCityGeo', () => {
    it('resolves a known city to its country and flag', () => {
        expect(lookupCityGeo('Sofia')).toEqual({ country: 'Bulgaria', flag: '🇧🇬' });
    });

    it('is case-insensitive and trims', () => {
        expect(lookupCityGeo('  lisbon ')).toEqual({ country: 'Portugal', flag: '🇵🇹' });
    });

    it('falls back to Other for unknown cities', () => {
        expect(lookupCityGeo('Atlantis')).toEqual({ country: 'Other', flag: '🌍' });
    });

    it('covers every city present in the lookup table', () => {
        for (const [, geo] of Object.entries(CITY_COUNTRY)) {
            expect(geo.country.length).toBeGreaterThan(0);
            expect(geo.flag.length).toBeGreaterThan(0);
        }
    });
});
