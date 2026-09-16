import express from 'express';
import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { propertyImportRouter } from './property-import.routes.js';

// The app is gated: neither import route may answer an anonymous caller. These
// assert the middleware wiring only — a 401 is returned before any handler runs,
// so no database is required.
//
// Role-level coverage (ADMIN → 403) needs a real session, which this hermetic
// suite cannot mint; it lives in scripts/smoke-property-import.mts instead.
// managerMiddleware itself is covered by middleware/auth.middleware.test.ts.
function appWith() {
    const app = express();
    app.use('/api/properties/import', propertyImportRouter);
    return app;
}

describe('import routes reject anonymous callers', () => {
    test('GET /template → 401', async () => {
        const res = await request(appWith()).get('/api/properties/import/template');
        expect(res.status).toBe(401);
    });

    test('POST / → 401', async () => {
        const res = await request(appWith()).post('/api/properties/import');
        expect(res.status).toBe(401);
    });
});
