import { Router, type Request, type Response } from 'express';
import { buildHealthReport, checkPostgres, releaseId } from './health.service.js';
import { getProviderSnapshot } from './provider-status.js'; // cached background probe results

export const healthRouter = Router();

const HEALTH_JSON = 'application/health+json';

// Liveness — process is up. NO I/O. Used to detect deadlock only.
healthRouter.get('/health/live', (_req, res) => {
    res.json({ status: 'pass', releaseId });
});

// Readiness — can we serve traffic? Checks our OWN Postgres. 200 | 503.
// Point Railway's healthcheck path here.
async function readiness(_req: Request, res: Response) {
    const checks = [await checkPostgres()];
    const report = buildHealthReport(checks, releaseId);
    res.type(HEALTH_JSON)
        .status(report.status === 'fail' ? 503 : 200)
        .json(report);
}

healthRouter.get('/health/ready', readiness);

// Backward-compat alias for the pre-split bare `/health` (DB-ping readiness, 200 | 503).
// Keeps existing Railway healthchecks / external monitors working through the deploy that
// introduces /health/ready, so the cutover isn't order-dependent. Safe to retire once all
// healthchecks point at /health/ready.
healthRouter.get('/health', readiness);

// Deep — full dependency report for dashboards. Reads CACHED probe results,
// never calls vendors inline. warn (soft dep down) stays 200; fail → 503.
healthRouter.get('/health/deep', async (_req, res) => {
    const checks = [await checkPostgres(), ...getProviderSnapshot()];
    const report = buildHealthReport(checks, releaseId);
    res.type(HEALTH_JSON)
        .status(report.status === 'fail' ? 503 : 200)
        .json(report);
});
