// Query params whose values are secrets/credentials and must never reach third-party
// telemetry (Sentry). Auth flows carry these in the URL (verify-email, reset-password,
// invitations, OAuth-style callbacks).
const SENSITIVE_PARAMS = ['token', 'code', 'state', 'invite', 'callbackURL', 'access_token', 'refresh_token'];

/**
 * Replaces the values of known-sensitive query params with `REDACTED`, preserving the rest
 * of the URL. Accepts absolute or relative (path-only) URLs and returns the same form.
 * Returns the input unchanged if it has no sensitive params or can't be parsed.
 */
export function redactUrl(url: string | undefined): string | undefined {
    if (!url) return url;
    try {
        const base = 'http://redacted.local';
        const parsed = new URL(url, base);
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
