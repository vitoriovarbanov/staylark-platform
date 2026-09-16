import { env } from './env.js';

/**
 * Rewrites a Better Auth backend URL into a frontend SPA URL carrying the token.
 *
 * Used for password reset, which *must* run in the SPA: the user has to type a new
 * password into a form, so the server cannot complete it from a plain link click.
 * Better Auth generates URLs like:
 *   - reset: http://backend/api/auth/reset-password/TOKEN?callbackURL=/reset-password
 */
export function toFrontendUrl(backendUrl: string, frontendPath: string): string {
    const parsed = new URL(backendUrl);
    // Token may be a query param (?token=xxx) or a path segment (/reset-password/TOKEN)
    const token = parsed.searchParams.get('token') ?? parsed.pathname.split('/').pop();
    return `${env.FRONTEND_URL}${frontendPath}?token=${token}`;
}

/**
 * Keeps Better Auth's backend verify endpoint and rewrites its `callbackURL` to the
 * backend-rendered result page (`GET /verify-email/result`).
 *
 * Email verification needs no user input, so the backend verifies the token on a plain
 * GET and 302-redirects to the callbackURL. Both the verify endpoint AND its landing
 * page stay on the backend so the whole flow requires NO client-side JavaScript —
 * critical because webmail clients render email inside a sandboxed iframe without
 * `allow-scripts`, which blocks an SPA's bundle from ever booting. The SPA route can't
 * be the landing page for the same reason; the result page is server-rendered HTML.
 *
 * Better Auth generates: http://backend/api/auth/verify-email?token=xxx&callbackURL=/
 * The callbackURL origin must pass Better Auth's originCheck — the auth server's own
 * base origin (BETTER_AUTH_URL) is trusted, so pointing at it needs no trustedOrigins
 * entry.
 */
export function withResultCallback(backendUrl: string): string {
    const parsed = new URL(backendUrl);
    parsed.searchParams.set('callbackURL', `${env.BETTER_AUTH_URL}/verify-email/result`);
    return parsed.toString();
}
