import express from 'express';
import request from 'supertest';
import { expect, test, describe } from 'vitest';
import { healthRouter } from './health.routes.js';

function appWith() {
    const app = express();
    app.use(healthRouter);
    return app;
}

describe('health endpoints', () => {
    test('GET /health/live → 200, no I/O', async () => {
        const res = await request(appWith()).get('/health/live');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('pass');
    });

    test('GET /health/ready → 200 or 503 with health+json', async () => {
        const res = await request(appWith()).get('/health/ready');
        expect([200, 503]).toContain(res.status);
        expect(res.headers['content-type']).toContain('application/health+json');
        expect(res.body).toHaveProperty('checks');
    });

    test('GET /health → backward-compat readiness alias (200 or 503, health+json)', async () => {
        const res = await request(appWith()).get('/health');
        expect([200, 503]).toContain(res.status);
        expect(res.headers['content-type']).toContain('application/health+json');
        expect(res.body).toHaveProperty('checks');
    });

    test('GET /health/deep → health+json with releaseId', async () => {
        const res = await request(appWith()).get('/health/deep');
        expect(res.body).toHaveProperty('releaseId');
        expect(res.body).toHaveProperty('checks');
    });
});
