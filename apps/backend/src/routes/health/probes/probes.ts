import type OpenAI from 'openai';
import { openai, isOpenAIMocked } from '../../../utils/openai.js';
import { withTimeout } from '../../../utils/with-timeout.js';
import { cloudinary } from '../../../config/cloudinary.js';
import { env } from '../../../config/env.js';
import { loadModel, predictMultiplier } from '../../pricing/service/pricing.model.js';
import type { CheckResult } from '../health.types.js';
import { pass, softFail, warn } from './check-result.js';

// OpenAI: GET /v1/models — validates reachability + key, bills ZERO tokens.
// NOTE: tickets-only and deprecating — remove once TICK migrates to the inference service.
export async function openaiProbe(client: OpenAI): Promise<CheckResult> {
    try {
        // 10s, not 4s: GET /v1/models returns the whole model catalogue and its latency is
        // variable from Railway egress — 4s timed out intermittently and paged the health gate.
        await withTimeout(client.models.list(), 10000, 'openai');
        return pass('openai:reachable');
    } catch (err) {
        return softFail('openai:reachable', err);
    }
}

// Resend: list domains — validates auth + sending-domain status, sends NO email.
export async function resendProbe(): Promise<CheckResult> {
    if (!env.RESEND_API_KEY) return softFail('resend:domain', new Error('no key'));
    try {
        const { Resend } = await import('resend');
        const client = new Resend(env.RESEND_API_KEY);
        const res = await withTimeout(client.domains.list(), 4000, 'resend');
        const status = res.data?.data?.[0]?.status ?? 'unknown';
        return pass('resend:domain', status);
    } catch (err) {
        return softFail('resend:domain', err);
    }
}

// Cloudinary: api.ping() — lightweight auth check, no upload.
export async function cloudinaryProbe(): Promise<CheckResult> {
    if (!env.CLOUDINARY_API_KEY) return softFail('cloudinary:reachable', new Error('no key'));
    try {
        await withTimeout(cloudinary.api.ping(), 4000, 'cloudinary');
        return pass('cloudinary:reachable');
    } catch (err) {
        return softFail('cloudinary:reachable', err);
    }
}

// Bound the real OpenAI client (skip when mocked locally).
export async function openaiProbeBound(): Promise<CheckResult> {
    if (isOpenAIMocked || !env.OPENAI_API_KEY) {
        return warn('openai:reachable', undefined, 'mocked/no-key');
    }
    return openaiProbe(openai);
}

// Pricing: run the IN-PROCESS linear-regression+sigmoid model on a fixed input and assert a
// finite multiplier. No network — this is pure TS reading prisma/pricing-model.json.
export async function pricingProbe(): Promise<CheckResult> {
    try {
        const model = loadModel();
        const value = predictMultiplier(model, { occupancy: 0.5, daysToCheckIn: 30, isWeekend: 0, month: 6 });
        if (!Number.isFinite(value)) throw new Error(`non-finite: ${value}`);
        return pass('pricing:model', String(value));
    } catch (err) {
        return softFail('pricing:model', err);
    }
}
