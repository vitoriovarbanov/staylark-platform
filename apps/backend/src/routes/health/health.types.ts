export type CheckStatus = 'pass' | 'warn' | 'fail';

/** One dependency probe outcome. `hard: true` means failing it makes the app unready (503). */
export interface CheckResult {
    name: string; // "{component}:{measurement}", e.g. "postgres:responseTime"
    status: CheckStatus;
    hard?: boolean;
    observedValue?: number | string;
    observedUnit?: string;
    output?: string; // error message on failure
    time?: string; // ISO timestamp of when the check last ran
}

/** RFC draft-inadarei health+json response body. */
export interface HealthReport {
    status: CheckStatus;
    releaseId: string;
    checks: Record<string, Array<Omit<CheckResult, 'name' | 'hard'>>>;
}
