import type { CheckResult } from '../health.types.js';
import { withTimeout } from '../../../utils/with-timeout.js';
import { pass, warn } from './check-result.js';

interface StatuspageSummary {
    status?: { indicator?: string; description?: string };
}

export function interpretStatuspageSummary(summary: StatuspageSummary, vendor: string): CheckResult {
    const indicator = summary.status?.indicator ?? 'unknown';
    const name = `${vendor}:providerStatus`;
    // Their incident → warn (attribution), never our 503.
    return indicator === 'none'
        ? pass(name, indicator)
        : warn(name, indicator, `provider-reported incident: ${summary.status?.description ?? indicator}`);
}

async function pollSummary(url: string, vendor: string): Promise<CheckResult> {
    try {
        const res = await withTimeout(fetch(url), 4000, `${vendor}-status`);
        const json = (await res.json()) as StatuspageSummary;
        return interpretStatuspageSummary(json, vendor);
    } catch (err) {
        return warn(`${vendor}:providerStatus`, undefined, err instanceof Error ? err.message : 'unreachable');
    }
}

export const openaiStatusProbe = (): Promise<CheckResult> =>
    pollSummary('https://status.openai.com/api/v2/summary.json', 'openai');
