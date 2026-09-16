import { describe, expect, test } from 'vitest';
import { withTimeout } from '../../../utils/with-timeout.js';
import { openaiProbe, pricingProbe } from './probes.js';

describe('withTimeout', () => {
    test('rejects after the deadline', async () => {
        const slow = new Promise(resolve => setTimeout(resolve, 50));
        await expect(withTimeout(slow, 5, 'slow')).rejects.toThrow(/timeout/);
    });
    test('resolves when fast enough', async () => {
        await expect(withTimeout(Promise.resolve('ok'), 50, 'fast')).resolves.toBe('ok');
    });
});

describe('openaiProbe', () => {
    test('maps a successful models.list() to pass', async () => {
        const fakeClient = { models: { list: async () => ({ data: [{ id: 'gpt-4o-mini' }] }) } };
        const result = await openaiProbe(fakeClient as never);
        expect(result.name).toBe('openai:reachable');
        expect(result.status).toBe('pass');
    });
    test('maps an auth error to fail (soft)', async () => {
        const fakeClient = {
            models: {
                list: async () => {
                    throw new Error('401 Unauthorized');
                }
            }
        };
        const result = await openaiProbe(fakeClient as never);
        expect(result.status).toBe('fail');
        expect(result.hard).not.toBe(true); // vendor down must not make us unready
        expect(result.output).toContain('401');
    });
});

describe('pricingProbe', () => {
    test('runs the in-process model and returns a finite multiplier (pass)', async () => {
        const result = await pricingProbe();
        expect(result.name).toBe('pricing:model');
        expect(result.status).toBe('pass');
        expect(Number(result.observedValue)).toBeGreaterThan(0);
        expect(Number.isFinite(Number(result.observedValue))).toBe(true);
    });
});
