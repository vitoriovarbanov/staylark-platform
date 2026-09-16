import { describe, expect, test } from 'vitest';
import { redactUrl } from './redact-url.js';

describe('redactUrl', () => {
    test('redacts a token query param, keeps the rest', () => {
        expect(redactUrl('https://app.example.com/verify-email?token=secret123&status=success')).toBe(
            'https://app.example.com/verify-email?token=REDACTED&status=success'
        );
    });

    test('redacts callbackURL + token on the backend verify endpoint', () => {
        const out = redactUrl('/api/auth/verify-email?token=abc&callbackURL=https://app/x');
        expect(out).toContain('token=REDACTED');
        expect(out).toContain('callbackURL=REDACTED');
    });

    test('leaves URLs without sensitive params unchanged', () => {
        expect(redactUrl('/properties/123?city=sofia')).toBe('/properties/123?city=sofia');
    });

    test('handles undefined and unparseable input', () => {
        expect(redactUrl(undefined)).toBeUndefined();
        expect(redactUrl('')).toBe('');
    });
});
