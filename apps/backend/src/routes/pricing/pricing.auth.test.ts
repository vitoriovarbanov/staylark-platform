import express from 'express';
import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { pricingRouter } from './pricing.routes.js';

function appWith() {
    const app = express();
    app.use('/api/pricing', pricingRouter);
    return app;
}

describe('pricing routes reject anonymous callers', () => {
    test('GET /api/pricing/:propertyId → 401', async () => {
        const res = await request(appWith()).get('/api/pricing/some-id?checkIn=2026-08-01&checkOut=2026-08-05');
        expect(res.status).toBe(401);
    });

    test('the admin routes are still reachable as literal paths, not shadowed by /:propertyId', async () => {
        // Both 401 anonymously; what matters is that /rules did not fall through to the
        // quote handler, which would have rejected the missing query params with a 400.
        const res = await request(appWith()).get('/api/pricing/rules');
        expect(res.status).toBe(401);
    });
});
