import type { ClassifyResult } from '@staylark/contract';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { recordInferenceOk, recordInferenceFail } from '../routes/health/probes/inference-health.js';

export const isInferenceMocked = env.USE_INFERENCE_MOCK;

const headers = { 'X-Inference-Key': env.INFERENCE_API_KEY };

// Cold-start retry: when the inference service is sleeping (Railway app-sleep), the first
// request fails the connection while the container wakes (~15–30s) — and private networking,
// unlike Railway's public proxy, does NOT queue it. So we retry the connection (with backoff)
// through the wake instead of failing fast. Backoff: 2,4,8,16s ≈ 30s total, comfortably more
// than a cold start. A warm service succeeds on the first attempt with no delay. After the
// budget is exhausted (service genuinely down), the error propagates and the caller degrades
// as before. Only connection errors and gateway 502/503/504 are retried — real HTTP errors
// (e.g. 401 bad key, 422) are returned immediately.
const COLD_START_ATTEMPTS = 5;
const COLD_START_BACKOFF_MS = 2000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithWake(url: string, init: RequestInit, label: string): Promise<Response> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= COLD_START_ATTEMPTS; attempt++) {
        try {
            const res = await fetch(url, init);
            // A waking service behind a gateway can briefly return 502/503/504 — retry those;
            // surface every other status to the caller.
            if ([502, 503, 504].includes(res.status) && attempt < COLD_START_ATTEMPTS) {
                throw new Error(`inference gateway ${res.status}`);
            }
            // Passive health signal for /health/deep (no active probe — would defeat Railway
            // app-sleep). Record by real outcome: a 2xx is healthy; any other status (bad key
            // 401, model 500, etc.) means the service responded but the call failed → soft fail,
            // so a credential/upstream break actually surfaces instead of showing green.
            if (res.ok) recordInferenceOk();
            else recordInferenceFail(new Error(`inference HTTP ${res.status}`));
            return res;
        } catch (err) {
            lastErr = err;
            if (attempt >= COLD_START_ATTEMPTS) break;
            const delayMs = COLD_START_BACKOFF_MS * 2 ** (attempt - 1);
            logger.warn({ label, attempt, delayMs }, 'Inference unreachable; retrying (service may be waking)');
            await sleep(delayMs);
        }
    }
    // Retry budget exhausted (genuinely unreachable) → record the failure before propagating.
    recordInferenceFail(lastErr);
    throw lastErr;
}

async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetchWithWake(
        `${env.INFERENCE_URL}${path}`,
        {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        },
        `POST ${path}`
    );
    if (!res.ok) throw new Error(`inference ${path} failed: ${res.status}`);
    return (await res.json()) as T;
}

export const inferenceClient = {
    /**
     * Transcribe audio via faster-whisper. An optional `prompt` biases Whisper's
     * vocabulary (e.g. the property's city/address) so local proper nouns are
     * spelled correctly instead of guessed phonetically.
     */
    transcribe: async (audioBuffer: Buffer, mimeType: string, filename: string, prompt?: string): Promise<string> => {
        const form = new FormData();
        form.append('file', new Blob([audioBuffer], { type: mimeType }), filename);
        if (prompt) form.append('prompt', prompt);
        const res = await fetchWithWake(
            `${env.INFERENCE_URL}/transcribe`,
            { method: 'POST', headers, body: form },
            'POST /transcribe'
        );
        if (!res.ok) throw new Error(`inference /transcribe failed: ${res.status}`);
        const json = (await res.json()) as { text: string };
        return json.text;
    },

    /** Sentiment + score via nlptown classifier. */
    classify: (text: string): Promise<ClassifyResult> => post<ClassifyResult>('/classify', { text }),

    /** Relevance gate: is this transcript actually property feedback (vs off-topic)? */
    relevance: (text: string): Promise<{ isReview: boolean; score: number }> =>
        post<{ isReview: boolean; score: number }>('/relevance', { text }),

    /** Extractive summary (null when text too short). */
    summarize: async (text: string): Promise<string | null> => {
        const json = await post<{ summary: string | null }>('/summarize', { text });
        return json.summary;
    },

    /** Aspect tags for one review (embedding similarity against a fixed taxonomy). */
    tagAspects: (text: string): Promise<{ topics: string[] }> => post<{ topics: string[] }>('/aspects', { text })
};
