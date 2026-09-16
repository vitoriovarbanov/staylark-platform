// Query params whose values are secrets and must never reach third-party telemetry (Sentry).
// Auth flows carry these in the URL (verify-email, reset-password, invitations).
const SENSITIVE_PARAMS = ['token', 'code', 'state', 'invite', 'callbackURL', 'access_token', 'refresh_token'];

/**
 * Replaces known-sensitive query-param values with `REDACTED`, preserving the rest of the URL.
 * Accepts absolute or relative URLs and returns the same form; returns the input unchanged if
 * there's nothing to redact or it can't be parsed.
 */
export function redactUrl(url: string | undefined): string | undefined {
    if (!url) return url;
    try {
        const parsed = new URL(url, 'http://redacted.local');
        let changed = false;
        for (const key of SENSITIVE_PARAMS) {
            if (parsed.searchParams.has(key)) {
                parsed.searchParams.set(key, 'REDACTED');
                changed = true;
            }
        }
        if (!changed) return url;
        return /^[a-z]+:\/\//i.test(url) ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return url;
    }
}
