import { logger } from '../../../utils/logger.js';
import type { CheckResult } from '../health.types.js';
import { softFail } from './check-result.js';

export type Probe = () => Promise<CheckResult>;

/** Runs a set of probes on an interval and caches the latest results in memory. */
export class ProbeRunner {
    private cache: CheckResult[] = [];
    private timer?: NodeJS.Timeout;

    constructor(private readonly probes: Probe[]) {}

    snapshot(): CheckResult[] {
        return this.cache;
    }

    async runOnce(): Promise<void> {
        const results = await Promise.all(
            this.probes.map(async probe => {
                try {
                    return await probe();
                } catch (err) {
                    return softFail('probe:error', err);
                }
            })
        );
        this.cache = results;
    }

    start(intervalMs: number): void {
        void this.runOnce();
        this.timer = setInterval(() => void this.runOnce(), intervalMs);
        this.timer.unref?.();
        logger.info({ intervalMs, probes: this.probes.length }, '[probes] runner started');
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
    }
}
