import { db } from '../../config/database.js';
import { withTimeout } from '../../utils/with-timeout.js';
import type { CheckResult, CheckStatus, HealthReport } from './health.types.js';

/** Aggregate rule: any HARD fail → fail; else any fail/warn → warn; else pass. */
export function overallStatus(checks: CheckResult[]): CheckStatus {
    if (checks.some(c => c.status === 'fail' && c.hard)) return 'fail';
    if (checks.some(c => c.status === 'fail' || c.status === 'warn')) return 'warn';
    return 'pass';
}

export function buildHealthReport(checks: CheckResult[], releaseId: string): HealthReport {
    const grouped: HealthReport['checks'] = {};
    for (const check of checks) {
        // Group by `name`, dropping `name`/`hard` from the per-entry detail (health+json shape).
        const detail: Omit<CheckResult, 'name' | 'hard'> = {
            status: check.status,
            observedValue: check.observedValue,
            observedUnit: check.observedUnit,
            output: check.output,
            time: check.time
        };
        (grouped[check.name] ??= []).push(detail);
    }
    return { status: overallStatus(checks), releaseId, checks: grouped };
}

/** Readiness: can we reach our OWN Postgres? Hard dependency. ~1s timeout. */
export async function checkPostgres(timeoutMs = 1000): Promise<CheckResult> {
    const started = Date.now();
    try {
        await withTimeout(db.$queryRaw`SELECT 1`, timeoutMs, 'postgres');
        return {
            name: 'postgres:responseTime',
            status: 'pass',
            hard: true,
            observedValue: Date.now() - started,
            observedUnit: 'ms',
            time: new Date().toISOString()
        };
    } catch (err) {
        return {
            name: 'postgres:responseTime',
            status: 'fail',
            hard: true,
            output: err instanceof Error ? err.message : 'unknown',
            time: new Date().toISOString()
        };
    }
}

/** Short git SHA for the running build, if Railway/CI provided it. */
export const releaseId = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev';
