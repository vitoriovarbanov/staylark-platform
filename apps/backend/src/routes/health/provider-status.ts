import { ProbeRunner } from './probes/probe-runner.js';
import { openaiProbeBound, resendProbe, cloudinaryProbe, pricingProbe } from './probes/probes.js';
import { inferenceProbe } from './probes/inference-health.js';
import { openaiStatusProbe } from './probes/status-pages.js';
import type { CheckResult } from './health.types.js';

export const providerRunner = new ProbeRunner([
    inferenceProbe, // passive — reads last real-call outcome, no network (preserves app-sleep)
    pricingProbe, // in-process model check
    openaiProbeBound, // tickets-only; remove once TICK migrates to inference
    resendProbe,
    cloudinaryProbe,
    openaiStatusProbe
]);

export function getProviderSnapshot(): CheckResult[] {
    return providerRunner.snapshot();
}
