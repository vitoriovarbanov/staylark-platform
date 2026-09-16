import { Router } from 'express';
import { renderResult } from './render-result.js';

export const verifyEmailResultRouter = Router();

/**
 * Landing page Better Auth 302-redirects to after it verifies an email token
 * (callbackURL → here; see `withResultCallback` in config/auth-urls.ts).
 *
 * Renders server-side, no-JS HTML so it displays inside a sandboxed webmail iframe.
 * Overrides helmet's cross-origin embedding restrictions for this one response: the page
 * holds no secrets, runs no scripts, and performs no actions, so letting a cross-origin
 * webmail frame embed it is safe — and necessary, since that's exactly where it must
 * render. Three independent gates must ALL allow the embed:
 *   - X-Frame-Options / CSP frame-ancestors — controls who may frame us
 *   - Cross-Origin-Resource-Policy — helmet defaults to `same-origin`, which makes the
 *     browser refuse the load in a cross-origin context with ERR_BLOCKED_BY_RESPONSE
 *   - Cross-Origin-Opener-Policy — helmet's `same-origin` opener isolation compounds it
 */
verifyEmailResultRouter.get('/verify-email/result', (req, res) => {
    const error = typeof req.query.error === 'string' ? req.query.error : undefined;

    // Allow framing from anywhere (helmet defaults to X-Frame-Options: SAMEORIGIN +
    // frame-ancestors 'self', both of which would refuse the webmail frame). The CSP
    // is *tighter* than helmet's elsewhere — scripts are forbidden outright.
    res.removeHeader('X-Frame-Options');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors *"
    );

    // Permit cross-origin embedding (webmail iframe). Without these, helmet's
    // `same-origin` CORP/COOP block the load before any framing rule is even consulted.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

    // Always 200: the page body carries the outcome; a 200 keeps webmail/proxies from
    // suppressing it.
    res.type('html').status(200).send(renderResult(error));
});
