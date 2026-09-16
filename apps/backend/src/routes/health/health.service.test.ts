import { describe, expect, test } from 'vitest';
import { buildHealthReport, overallStatus } from './health.service.js';
import type { CheckResult } from './health.types.js';

describe('overallStatus', () => {
    test('all pass → pass', () => {
        const checks: CheckResult[] = [
            { name: 'postgres:responseTime', status: 'pass' },
            { name: 'openai:reachable', status: 'pass' }
        ];
        expect(overallStatus(checks)).toBe('pass');
    });

    test('any hard fail → fail', () => {
        const checks: CheckResult[] = [{ name: 'postgres:responseTime', status: 'fail', hard: true }];
        expect(overallStatus(checks)).toBe('fail');
    });

    test('soft dep fail → warn, not fail', () => {
        const checks: CheckResult[] = [
            { name: 'postgres:responseTime', status: 'pass' },
            { name: 'openai:reachable', status: 'fail' } // soft (hard !== true)
        ];
        expect(overallStatus(checks)).toBe('warn');
    });
});

describe('buildHealthReport', () => {
    test('produces health+json shape with releaseId and grouped checks', () => {
        const report = buildHealthReport(
            [{ name: 'postgres:responseTime', status: 'pass', observedValue: 5, observedUnit: 'ms' }],
            'abc123'
        );
        expect(report.status).toBe('pass');
        expect(report.releaseId).toBe('abc123');
        expect(report.checks['postgres:responseTime'][0].status).toBe('pass');
        expect(report.checks['postgres:responseTime'][0].observedValue).toBe(5);
    });
});
