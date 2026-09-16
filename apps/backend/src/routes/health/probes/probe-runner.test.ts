import { describe, expect, test } from 'vitest';
import { ProbeRunner } from './probe-runner.js';
import type { CheckResult } from '../health.types.js';

const passing = async (): Promise<CheckResult> => ({ name: 'x:reachable', status: 'pass' });
const failing = async (): Promise<CheckResult> => ({ name: 'y:reachable', status: 'fail' });

describe('ProbeRunner', () => {
    test('snapshot is empty before first run', () => {
        const runner = new ProbeRunner([passing]);
        expect(runner.snapshot()).toEqual([]);
    });

    test('runOnce caches all probe results', async () => {
        const runner = new ProbeRunner([passing, failing]);
        await runner.runOnce();
        expect(runner.snapshot().map(r => r.status)).toEqual(['pass', 'fail']);
    });

    test('a throwing probe is recorded as fail, not crashing the runner', async () => {
        const boom = async (): Promise<CheckResult> => {
            throw new Error('kaboom');
        };
        const runner = new ProbeRunner([passing, boom]);
        await runner.runOnce();
        const statuses = runner.snapshot().map(r => r.status);
        expect(statuses).toContain('pass');
        expect(statuses).toContain('fail');
    });
});
