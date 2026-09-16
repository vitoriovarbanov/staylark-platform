import * as Sentry from '@sentry/node';
import { redactUrl } from './utils/redact-url.js';

const dsn = process.env.SENTRY_DSN;

// No DSN (local dev) → Sentry is a no-op; nothing is sent.
if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV ?? 'development',
        release: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7),
        tracesSampleRate: 0.1,
        // Strip auth tokens from captured request URLs before they reach Sentry — the
        // verify-email / reset-password endpoints carry secrets in the query string.
        beforeSend(event) {
            if (event.request?.url) event.request.url = redactUrl(event.request.url);
            return event;
        }
    });
}
