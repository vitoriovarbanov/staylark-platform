import { describe, expect, test } from 'vitest';
import { recordInferenceOk, recordInferenceFail, inferenceProbe, __resetInferenceHealth } from './inference-health.js';

describe('inference passive health', () => {
    test('idle (no calls yet) → pass with observedValue "idle", never fail', async () => {
        __resetInferenceHealth();
        const r = await inferenceProbe();
        expect(r.name).toBe('inference:reachable');
        expect(r.status).toBe('pass');
        expect(r.observedValue).toBe('idle');
        expect(r.hard).not.toBe(true); // soft dep — must never 503
    });

    test('after a success → pass', async () => {
        __resetInferenceHealth();
        recordInferenceOk();
        const r = await inferenceProbe();
        expect(r.status).toBe('pass');
    });

    test('after a failure → fail (soft)', async () => {
        __resetInferenceHealth();
        recordInferenceFail(new Error('connect ECONNREFUSED'));
        const r = await inferenceProbe();
        expect(r.status).toBe('fail');
        expect(r.hard).not.toBe(true);
        expect(r.output).toContain('ECONNREFUSED');
    });

    test('a stale failure decays to pass "idle/stale" (we no longer know)', async () => {
        __resetInferenceHealth();
        // simulate an old failure beyond the freshness window
        recordInferenceFail(new Error('old'), Date.now() - 60 * 60 * 1000);
        const r = await inferenceProbe();
        expect(r.status).toBe('pass');
        expect(String(r.observedValue)).toContain('stale');
    });
});
