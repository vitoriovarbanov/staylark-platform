import type { CheckResult, CheckStatus } from '../health.types.js';

// How long a recorded outcome is considered authoritative. Past this, we report
// "idle/stale" (pass) rather than a fail — a sleeping, untrafficked service is not
// "down", we simply have no recent signal. The daily smoke test is the active check.
const FRESHNESS_MS = 15 * 60 * 1000;

interface Outcome {
    ok: boolean;
    at: number; // epoch ms
    output?: string;
}

let last: Outcome | null = null;

export function recordInferenceOk(at: number = Date.now()): void {
    last = { ok: true, at };
}

export function recordInferenceFail(err: unknown, at: number = Date.now()): void {
    last = { ok: false, at, output: err instanceof Error ? err.message : 'unknown' };
}

/** Test-only reset. */
export function __resetInferenceHealth(): void {
    last = null;
}

// Passive: reads last-known outcome, NEVER calls the network (would wake the service).
// Soft dependency — never `hard: true`, so inference being down → warn-at-most, never 503.
export async function inferenceProbe(): Promise<CheckResult> {
    const now = Date.now();
    let status: CheckStatus = 'pass';
    let observedValue: string | undefined;
    let output: string | undefined;

    if (!last) {
        observedValue = 'idle';
    } else {
        const age = now - last.at;
        if (age > FRESHNESS_MS) {
            observedValue = `idle/stale (${Math.round(age / 60000)}m)`; // no recent signal ≠ down
        } else if (last.ok) {
            observedValue = `${Math.round(age / 1000)}s ago`;
        } else {
            status = 'fail'; // soft (no `hard`) — a recent real failure
            output = last.output;
        }
    }

    return { name: 'inference:reachable', status, observedValue, output, time: new Date(now).toISOString() };
}
