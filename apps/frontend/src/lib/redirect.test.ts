import { describe, expect, test } from 'vitest';
import { buildSignInPath, safeRedirect } from './redirect';

describe('safeRedirect', () => {
    test('accepts an ordinary in-app path', () => {
        expect(safeRedirect('/properties')).toBe('/properties');
    });

    test('keeps the query string intact', () => {
        expect(safeRedirect('/properties?city=Sofia')).toBe('/properties?city=Sofia');
    });

    test('rejects a protocol-relative URL (open redirect to another host)', () => {
        expect(safeRedirect('//evil.example.com')).toBe('/');
    });

    test('rejects an absolute URL', () => {
        expect(safeRedirect('https://evil.example.com')).toBe('/');
    });

    test('rejects null and empty input', () => {
        expect(safeRedirect(null)).toBe('/');
        expect(safeRedirect('')).toBe('/');
    });

    test('honours a caller-supplied fallback', () => {
        expect(safeRedirect(null, '/admin')).toBe('/admin');
    });
});

describe('buildSignInPath', () => {
    test('preserves pathname, search and hash', () => {
        const path = buildSignInPath({ pathname: '/properties', search: '?city=Sofia', hash: '#map' });
        expect(path).toBe(`/sign-in?redirect=${encodeURIComponent('/properties?city=Sofia#map')}`);
    });

    test('handles a bare pathname', () => {
        expect(buildSignInPath({ pathname: '/tickets', search: '', hash: '' })).toBe(
            `/sign-in?redirect=${encodeURIComponent('/tickets')}`
        );
    });

    test('round-trips back through safeRedirect', () => {
        const path = buildSignInPath({ pathname: '/properties', search: '?a=1&b=2', hash: '' });
        const raw = new URLSearchParams(path.split('?')[1]).get('redirect');
        expect(safeRedirect(raw)).toBe('/properties?a=1&b=2');
    });

    test('does not add a redirect param for the root path', () => {
        expect(buildSignInPath({ pathname: '/', search: '', hash: '' })).toBe('/sign-in');
    });
});
