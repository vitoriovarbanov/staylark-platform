import './instrument.js'; // MUST be first — sets up Sentry before app code loads
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { db } from './config/database.js';
import { initRealtime, closeRealtime } from './realtime/realtime.js';
import { providerRunner } from './routes/health/provider-status.js';
import { propertyImportService } from './routes/properties/import/service/property-import.service.js';

const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);

    // Finish photo migrations from bulk imports that a crash or deploy interrupted.
    // Fire-and-forget: this must never delay or block startup.
    void propertyImportService.sweepUnmigratedPhotos().catch(err => {
        logger.error({ err }, 'Photo migration sweep failed');
    });
});

initRealtime(server);

// Background provider probes — caches results in memory for /health/deep.
// inferenceProbe is passive (no network), so this never wakes the sleeping inference service.
providerRunner.start(env.PROBE_INTERVAL_MS);

// ── Graceful shutdown ──────────────────────────────────────────
function shutdown(signal: string) {
    logger.info(`${signal} received — shutting down gracefully`);
    providerRunner.stop(); // in-memory interval — stop eagerly
    // closeRealtime disconnects sockets and closes the underlying http server.
    closeRealtime(() => {
        void db.$disconnect().then(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
        logger.error('Forced shutdown — graceful close timed out');
        process.exit(1);
    }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
