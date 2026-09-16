import type { CheckResult } from '../health.types.js';

// Factories for the common probe outcomes, each stamped with the current time. Soft results
// (warn / fail-without-`hard`) keep a vendor/inference outage at `warn` overall — never a 503.

export function pass(name: string, observedValue?: string): CheckResult {
    return { name, status: 'pass', observedValue, time: new Date().toISOString() };
}

export function warn(name: string, observedValue?: string, output?: string): CheckResult {
    return { name, status: 'warn', observedValue, output, time: new Date().toISOString() };
}

export function softFail(name: string, err: unknown): CheckResult {
    return {
        name,
        status: 'fail', // soft: no `hard: true`, so overall → warn, never 503
        output: err instanceof Error ? err.message : 'unknown',
        time: new Date().toISOString()
    };
}
