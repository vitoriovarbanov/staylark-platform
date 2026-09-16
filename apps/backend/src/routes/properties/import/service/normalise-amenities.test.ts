import { describe, expect, test } from 'vitest';
import { normaliseAmenities } from './normalise-amenities.js';

const known = ['Wi-Fi', 'Parking', 'Air conditioning'];

describe('normaliseAmenities', () => {
    test('snaps a case variant to the existing catalogue value', () => {
        expect(normaliseAmenities(['wi-fi'], known)).toEqual(['Wi-Fi']);
        expect(normaliseAmenities(['PARKING'], known)).toEqual(['Parking']);
    });

    test('keeps an unknown amenity as typed', () => {
        expect(normaliseAmenities(['Sauna'], known)).toEqual(['Sauna']);
    });

    test('trims and collapses whitespace', () => {
        expect(normaliseAmenities(['  Hot   tub  '], known)).toEqual(['Hot tub']);
    });

    test('dedupes case-insensitively', () => {
        expect(normaliseAmenities(['Wi-Fi', 'wi-fi', 'WI-FI'], known)).toEqual(['Wi-Fi']);
    });

    test('drops empty values', () => {
        expect(normaliseAmenities(['', '  '], known)).toEqual([]);
    });

    test('preserves first-seen order', () => {
        expect(normaliseAmenities(['Sauna', 'wi-fi'], known)).toEqual(['Sauna', 'Wi-Fi']);
    });

    test('works with an empty catalogue', () => {
        expect(normaliseAmenities(['Wi-Fi'], [])).toEqual(['Wi-Fi']);
    });
});
