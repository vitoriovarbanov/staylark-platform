import { describe, it, expect } from 'vitest';
import { escapeHtml, unescapeHtml, renderEmail } from './layout.js';

describe('unescapeHtml', () => {
    it('reverses escapeHtml for all escaped entities', () => {
        const raw = `a & b < c > d " e ' f`;
        expect(unescapeHtml(escapeHtml(raw))).toBe(raw);
    });

    it('recovers a clickable URL from an escaped href (the & between query params)', () => {
        const url =
            'http://localhost:3001/api/auth/verify-email?token=abc&callbackURL=http%3A%2F%2Flocalhost%3A3001%2Fverify-email%2Fresult';
        expect(unescapeHtml(escapeHtml(url))).toBe(url);
    });

    it('round-trips a doubly-escaped entity', () => {
        // escaping the literal string "&lt;" yields "&amp;lt;", which must decode back
        expect(unescapeHtml(escapeHtml('&lt;'))).toBe('&lt;');
    });

    it('extracts a usable URL from a rendered email href', () => {
        const url = 'http://localhost:3001/api/auth/verify-email?token=abc&callbackURL=%2Fx';
        const html = renderEmail({ heading: 'Verify', bodyHtml: '', button: { label: 'Verify', url } });
        const href = html.match(/href="([^"]+)"/)?.[1];
        // The raw href is HTML-escaped (contains &amp;); decoding restores the real URL.
        expect(href).toContain('&amp;callbackURL=');
        expect(unescapeHtml(href!)).toBe(url);
    });
});
