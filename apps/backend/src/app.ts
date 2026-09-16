import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { auth } from './config/auth.js';
import { logger } from './utils/logger.js';
import { registerRoutes } from './routes/index.js';
import { mountApiDocs } from './docs/swagger.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

// Health endpoints (`/health`, `/health/live|ready|deep`) bypass rate-limiting and request
// logging. Matches the health namespace exactly so an unrelated `/health-data` route can't
// silently inherit the exemption.
const isHealthRequest = (req: { url: string }) => req.url === '/health' || req.url.startsWith('/health/');

// ── CORS ───────────────────────────────────────────────────────
// Three things must align: credentials: true + explicit origin here,
// withCredentials: true on Axios (frontend), trustedOrigins in auth config.
app.use(
    cors({
        origin: env.FRONTEND_URL,
        credentials: true
    })
);

// ── Rate limiting ──────────────────────────────────────────────
// Stricter limit for auth endpoints — MUST be before Better Auth handler,
// otherwise app.all() handles the request and this middleware never runs.
app.use(
    '/api/auth',
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: env.NODE_ENV === 'production' ? 20 : 200,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
            error: 'Too Many Requests',
            message: 'Too many auth attempts. Try again later.',
            statusCode: 429
        }
    })
);

// ── Better Auth ────────────────────────────────────────────────
// MUST be before express.json() — Better Auth handles its own body parsing.
// Requests hang forever with no error if misordered.
app.all('/api/auth/*splat', toNodeHandler(auth));

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json());

// ── Security headers ───────────────────────────────────────────
app.use(helmet());

// Global: 300 requests per 15 minutes per IP
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 300,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        skip: isHealthRequest,
        message: {
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Try again later.',
            statusCode: 429
        }
    })
);

// ── Request logging ────────────────────────────────────────────
app.use(
    pinoHttp({
        logger,
        autoLogging: {
            ignore: isHealthRequest
        }
    })
);

// ── Routes ─────────────────────────────────────────────────────
registerRoutes(app);

// ── API docs (Swagger UI) — gated; mounts nothing in real production ──
mountApiDocs(app);

// ── 404 catch-all ──────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        statusCode: 404
    });
});

// ── Sentry error capture ───────────────────────────────────────
// Must run before our handler formats the response. No-op when SENTRY_DSN is unset.
Sentry.setupExpressErrorHandler(app);

// ── Global error handler (MUST be last) ────────────────────────
app.use(errorMiddleware);

export { app };
