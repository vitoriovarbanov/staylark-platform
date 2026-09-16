import express from 'express';
import helmet from 'helmet';
import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { verifyEmailResultRouter } from './verify-email-result.routes.js';

// Mirror app.ts: helmet runs first, then the route. The route must override helmet's
// frame-blocking headers so a cross-origin webmail iframe can embed it.
function appWith() {
    const app = express();
    app.use(helmet());
    app.use(verifyEmailResultRouter);
    return app;
}

describe('GET /verify-email/result', () => {
    test('200 text/html on success (no error param)', async () => {
        const res = await request(appWith()).get('/verify-email/result');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
        expect(res.text).toMatch(/verified/i);
    });

    test('renders the expired page for ?error=TOKEN_EXPIRED', async () => {
        const res = await request(appWith()).get('/verify-email/result?error=TOKEN_EXPIRED');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/expired/i);
    });

    test('drops X-Frame-Options so webmail can frame it', async () => {
        const res = await request(appWith()).get('/verify-email/result');
        expect(res.headers['x-frame-options']).toBeUndefined();
    });

    test('CSP allows framing from anywhere and forbids scripts', async () => {
        const res = await request(appWith()).get('/verify-email/result');
        const csp = res.headers['content-security-policy'];
        expect(csp).toContain('frame-ancestors *');
        expect(csp).not.toContain("script-src 'self'");
    });

    test('relaxes CORP/COOP so a cross-origin webmail frame can load it', async () => {
        // helmet defaults both to `same-origin`, which blocks the cross-origin embed with
        // ERR_BLOCKED_BY_RESPONSE before any framing rule is consulted.
        const res = await request(appWith()).get('/verify-email/result');
        expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
        expect(res.headers['cross-origin-opener-policy']).toBe('unsafe-none');
    });
});
