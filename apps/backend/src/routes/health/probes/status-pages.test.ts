import { describe, expect, test } from 'vitest';
import { interpretStatuspageSummary } from './status-pages.js';

describe('interpretStatuspageSummary', () => {
    test('none indicator → pass', () => {
        expect(interpretStatuspageSummary({ status: { indicator: 'none' } }, 'openai').status).toBe('pass');
    });
    test('major indicator → warn (provider incident, not our fault)', () => {
        const r = interpretStatuspageSummary({ status: { indicator: 'major' } }, 'openai');
        expect(r.status).toBe('warn');
        expect(r.output).toContain('provider');
    });
});
