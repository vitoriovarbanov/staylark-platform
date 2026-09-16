import { describe, expect, test } from 'vitest';
import { renderResult } from './render-result.js';

// Test env (vitest.config.ts): FRONTEND_URL=http://localhost:4200

describe('renderResult', () => {
    test('no error code → success page', () => {
        const html = renderResult();
        expect(html).toMatch(/verified/i);
    });

    test('TOKEN_EXPIRED → expired page', () => {
        const html = renderResult('TOKEN_EXPIRED');
        expect(html).toMatch(/expired/i);
        expect(html).not.toMatch(/verified/i);
    });

    test('INVALID_TOKEN → invalid page', () => {
        const html = renderResult('INVALID_TOKEN');
        expect(html).toMatch(/invalid/i);
    });

    test('unknown error code → invalid page (safe default)', () => {
        const html = renderResult('SOMETHING_NEW');
        expect(html).toMatch(/invalid/i);
        expect(html).not.toMatch(/verified/i);
    });

    test('never emits a <script> — the whole point in a sandboxed webmail frame', () => {
        for (const code of [undefined, 'TOKEN_EXPIRED', 'INVALID_TOKEN', 'USER_NOT_FOUND']) {
            expect(renderResult(code)).not.toMatch(/<script/i);
        }
    });

    test('shows the sign-in URL as text — and never as a clickable link (would re-trap in the sandbox)', () => {
        const html = renderResult();
        expect(html).toContain('localhost:4200/sign-in');
        expect(html).not.toMatch(/<a\b/i);
        expect(html).not.toContain('href');
    });
});
