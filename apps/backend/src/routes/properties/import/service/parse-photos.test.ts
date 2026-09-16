import { describe, expect, test } from 'vitest';
import { parsePhotoCell } from './parse-photos.js';

describe('parsePhotoCell', () => {
    test('returns an empty list for an empty cell', () => {
        expect(parsePhotoCell('')).toEqual({ urls: [], errors: [] });
        expect(parsePhotoCell(null)).toEqual({ urls: [], errors: [] });
    });

    test('splits on newlines', () => {
        const { urls } = parsePhotoCell('https://a.com/1.jpg\nhttps://a.com/2.jpg');
        expect(urls).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
    });

    test('splits on commas', () => {
        const { urls } = parsePhotoCell('https://a.com/1.jpg, https://a.com/2.jpg');
        expect(urls).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
    });

    test('ignores blank entries and surrounding whitespace', () => {
        const { urls } = parsePhotoCell('  https://a.com/1.jpg  \n\n , \n https://a.com/2.jpg ');
        expect(urls).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
    });

    test('dedupes repeated urls', () => {
        const { urls } = parsePhotoCell('https://a.com/1.jpg\nhttps://a.com/1.jpg');
        expect(urls).toEqual(['https://a.com/1.jpg']);
    });

    test('rejects non-https urls', () => {
        const { urls, errors } = parsePhotoCell('http://a.com/1.jpg');
        expect(urls).toEqual([]);
        expect(errors[0]).toMatchObject({ value: 'http://a.com/1.jpg' });
        expect(errors[0]?.message).toMatch(/https/i);
    });

    test('rejects unparseable urls', () => {
        const { errors } = parsePhotoCell('not a url');
        expect(errors).toHaveLength(1);
    });

    test('rejects more than the photo cap', () => {
        const many = Array.from({ length: 11 }, (_, i) => `https://a.com/${i}.jpg`).join('\n');
        const { errors } = parsePhotoCell(many);
        expect(errors[0]?.message).toMatch(/at most 10/i);
    });

    test('reports every bad url, not just the first', () => {
        const { errors } = parsePhotoCell('http://a.com/1.jpg\nnonsense\nhttps://a.com/ok.jpg');
        expect(errors).toHaveLength(2);
    });
});
