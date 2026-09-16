import express from 'express';
import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { propertiesRouter } from './properties.routes.js';

// The app is gated: no endpoint here may answer an anonymous caller. These assert
// the middleware wiring only — a 401 is returned before any handler touches Prisma,
// so no database is required.
function appWith() {
    const app = express();
    app.use('/api/properties', propertiesRouter);
    return app;
}

const GATED_PATHS = [
    '/api/properties/amenities',
    '/api/properties/cities',
    '/api/properties/availability-status',
    '/api/properties/range-availability',
    '/api/properties',
    '/api/properties/some-id',
    '/api/properties/some-id/availability'
];

describe('properties routes reject anonymous callers', () => {
    test.each(GATED_PATHS)('GET %s → 401', async path => {
        const res = await request(appWith()).get(path);
        expect(res.status).toBe(401);
    });
});
