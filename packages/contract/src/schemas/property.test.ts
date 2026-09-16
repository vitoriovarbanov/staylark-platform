import { describe, expect, test } from 'vitest';
import { checkPriceBounds } from './property.js';

describe('checkPriceBounds', () => {
    test('accepts a property with no bounds set', () => {
        expect(checkPriceBounds({ nightlyPrice: 100 })).toBeNull();
    });

    test('accepts min <= base <= max', () => {
        expect(checkPriceBounds({ nightlyPrice: 100, minNightlyPrice: 80, maxNightlyPrice: 120 })).toBeNull();
    });

    test('accepts bounds equal to base', () => {
        expect(checkPriceBounds({ nightlyPrice: 100, minNightlyPrice: 100, maxNightlyPrice: 100 })).toBeNull();
    });

    test('rejects min above base', () => {
        expect(checkPriceBounds({ nightlyPrice: 100, minNightlyPrice: 120 })).toBe(
            'minNightlyPrice must not exceed nightlyPrice'
        );
    });

    test('rejects max below base', () => {
        expect(checkPriceBounds({ nightlyPrice: 100, maxNightlyPrice: 80 })).toBe(
            'maxNightlyPrice must not be below nightlyPrice'
        );
    });

    test('treats null bounds as unset', () => {
        expect(checkPriceBounds({ nightlyPrice: 100, minNightlyPrice: null, maxNightlyPrice: null })).toBeNull();
    });
});
