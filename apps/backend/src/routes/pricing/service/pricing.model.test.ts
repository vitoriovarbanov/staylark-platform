import { describe, expect, test } from 'vitest';
import { loadModel, predictMultiplier } from './pricing.model.js';

describe('loadModel (deployed-path regression)', () => {
    test('loads + parses the committed pricing model from the working dir', () => {
        // Resolves via process.cwd()/prisma/... — the SAME mechanism prod uses (Dockerfile
        // WORKDIR /app/apps/backend), so this passing means the bundled prod build finds the
        // file too. The old import.meta.dirname path resolved to /prisma/... once bundled → ENOENT.
        const model = loadModel();
        expect(model.coefficients).toBeDefined();
        expect(typeof model.coefficients.intercept).toBe('number');
    });

    test('predictMultiplier returns a finite, positive multiplier', () => {
        const value = predictMultiplier(loadModel(), {
            occupancy: 0.5,
            daysToCheckIn: 30,
            isWeekend: 0,
            month: 6
        });
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
    });
});
