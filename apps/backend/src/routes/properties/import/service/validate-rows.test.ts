import { describe, expect, test } from 'vitest';
import { validateRows } from './validate-rows.js';
import type { RawRow } from './parse-sheet.js';

const valid = {
    title: 'Flat A',
    description: 'Nice flat',
    type: 'APARTMENT',
    city: 'Sofia',
    address: '1 Main St',
    nightlyPrice: '100',
    minNightlyPrice: '',
    maxNightlyPrice: '',
    maxGuests: '',
    amenities: 'Wi-Fi, Parking',
    photos: ''
};
const row = (over: Partial<typeof valid> = {}, rowNumber = 2): RawRow => ({
    rowNumber,
    cells: { ...valid, ...over }
});

describe('validateRows', () => {
    test('accepts a valid row', () => {
        const { properties, errors } = validateRows([row()]);
        expect(errors).toEqual([]);
        expect(properties[0]?.property).toMatchObject({ title: 'Flat A', nightlyPrice: 100, type: 'APARTMENT' });
        expect(properties[0]?.rowNumber).toBe(2);
    });

    test('applies the maxGuests default when blank', () => {
        expect(validateRows([row()]).properties[0]?.property.maxGuests).toBe(4);
    });

    test('uppercases the type', () => {
        expect(validateRows([row({ type: 'apartment' })]).properties[0]?.property.type).toBe('APARTMENT');
    });

    test('splits amenities on commas', () => {
        expect(validateRows([row()]).properties[0]?.property.amenities).toEqual(['Wi-Fi', 'Parking']);
    });

    test('reports a non-numeric price against its column and row', () => {
        const { errors } = validateRows([row({ nightlyPrice: 'abc' }, 7)]);
        expect(errors[0]).toMatchObject({ row: 7, column: 'nightlyPrice', value: 'abc' });
    });

    test('reports an unknown property type', () => {
        const { errors } = validateRows([row({ type: 'FLAT' })]);
        expect(errors[0]?.column).toBe('type');
        expect(errors[0]?.message).toMatch(/APARTMENT/);
    });

    test('reports a missing required value', () => {
        const { errors } = validateRows([row({ city: '' })]);
        expect(errors[0]?.column).toBe('city');
    });

    // A manager reads these while looking at their own spreadsheet. Raw Zod wording
    // ("String must contain at least 1 character(s)") names JS types, not mistakes.
    describe('messages are manager-readable, not Zod internals', () => {
        const messageFor = (over: Partial<typeof valid>) => validateRows([row(over)]).errors[0]?.message ?? '';

        test('blank required field', () => {
            expect(messageFor({ city: '' })).toBe('City is required');
            expect(messageFor({ title: '' })).toBe('Title is required');
        });

        test('non-numeric price', () => {
            expect(messageFor({ nightlyPrice: 'about 200 lv' })).toMatch(/must be a number/i);
        });

        // A blank cell is a missing price, not a price of zero. Saying "must be greater
        // than 0" points the manager at a value they never entered.
        test('blank price reads as missing, not as zero', () => {
            expect(messageFor({ nightlyPrice: '' })).toBe('Nightly price is required');
        });

        test('guest count over the cap', () => {
            expect(messageFor({ maxGuests: '45' })).toBe('Must be 20 or fewer');
        });

        test('no message mentions Zod or JavaScript types', () => {
            const samples = [
                { city: '' },
                { title: '' },
                { nightlyPrice: 'abc' },
                { maxGuests: '45' },
                { maxGuests: '0' },
                { type: 'FLAT' }
            ];
            for (const s of samples) {
                const msg = messageFor(s);
                expect(msg).not.toMatch(
                    /String must|Expected \w+, received|Number must be (less|greater) than or equal/i
                );
                expect(msg.length).toBeGreaterThan(0);
            }
        });
    });

    test('reports price bounds violations', () => {
        const { errors } = validateRows([row({ minNightlyPrice: '150' })]);
        expect(errors[0]?.column).toBe('minNightlyPrice');
        expect(errors[0]?.message).toMatch(/must not exceed/);
    });

    test('collects errors from every bad row', () => {
        const { errors, properties } = validateRows([row({ city: '' }, 2), row({}, 3), row({ nightlyPrice: 'x' }, 4)]);
        expect(errors.map(e => e.row)).toEqual([2, 4]);
        expect(properties).toHaveLength(1);
    });

    test('reports invalid photo urls against the photos column', () => {
        const { errors } = validateRows([row({ photos: 'http://a.com/1.jpg' })]);
        expect(errors[0]?.column).toBe('photos');
    });

    test('keeps a valid row out of the results when its photos are bad', () => {
        const { properties } = validateRows([row({ photos: 'http://a.com/1.jpg' })]);
        expect(properties).toHaveLength(0);
    });

    test('accepts valid https photos', () => {
        const { properties, errors } = validateRows([row({ photos: 'https://a.com/1.jpg\nhttps://a.com/2.jpg' })]);
        expect(errors).toEqual([]);
        expect(properties[0]?.property.photos).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
    });
});
