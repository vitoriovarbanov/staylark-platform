import { describe, expect, test } from 'vitest';
import { toFrontendUrl, withResultCallback } from './auth-urls.js';

// Test env (vitest.config.ts): BETTER_AUTH_URL=http://localhost:3001, FRONTEND_URL=http://localhost:4200

describe('withResultCallback (email verification link)', () => {
    // Shape Better Auth produces for the verification link (see sendVerificationEmailFn).
    const backendUrl = 'http://localhost:3001/api/auth/verify-email?token=abc.def.ghi&callbackURL=%2F';

    test('keeps the backend verify endpoint so verification needs no client-side JS', () => {
        const url = new URL(withResultCallback(backendUrl));
        // Must stay on the backend: the server verifies the token on a plain GET and 302-redirects,
        // so it works even inside a sandboxed webmail iframe where SPA scripts are blocked.
        expect(url.origin).toBe('http://localhost:3001');
        expect(url.pathname).toBe('/api/auth/verify-email');
        expect(url.searchParams.get('token')).toBe('abc.def.ghi');
    });

    test('rewrites callbackURL to the backend-rendered result page', () => {
        const url = new URL(withResultCallback(backendUrl));
        // Backend origin (not the SPA): the result page is server-rendered HTML with no JS,
        // so it renders in the sandbox for both success and error outcomes.
        expect(url.searchParams.get('callbackURL')).toBe('http://localhost:3001/verify-email/result');
    });
});

describe('toFrontendUrl (reset-password link — unchanged, still needs the SPA form)', () => {
    test('points reset links at the frontend SPA carrying the token', () => {
        const url = new URL(
            toFrontendUrl('http://localhost:3001/api/auth/reset-password/TOKEN123?callbackURL=%2F', '/reset-password')
        );
        expect(url.origin).toBe('http://localhost:4200');
        expect(url.pathname).toBe('/reset-password');
        expect(url.searchParams.get('token')).toBe('TOKEN123');
    });
});
