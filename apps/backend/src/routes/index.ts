import type { Express } from 'express';
import { healthRouter } from './health/health.routes.js';
import { propertiesRouter } from './properties/properties.routes.js';
import { uploadRouter } from './upload/upload.routes.js';
import { bookingsRouter } from './bookings/bookings.routes.js';
import { feedbackRouter } from './feedback/feedback.routes.js';
import { ticketsRouter } from './tickets/tickets.routes.js';
import { pricingRouter } from './pricing/pricing.routes.js';
import { usersRouter } from './users/users.routes.js';
import { adminRouter } from './admin/admin.routes.js';
import { ticketRoutingRouter } from './ticket-routing/ticket-routing.routes.js';
import { invitationsPublicRouter } from './invitations/invitations.public.routes.js';
import { meRouter } from './me/me.routes.js';
import { verifyEmailResultRouter } from './verify-email-result/verify-email-result.routes.js';

/**
 * Central route registry — all API paths visible in one file.
 * Feature routers are added here as they're implemented.
 */
export function registerRoutes(app: Express): void {
    // ── Health checks ────────────────────────────────────────────
    app.use(healthRouter); // /health/live, /health/ready, /health/deep

    // ── Email verification landing page (no-JS, server-rendered) ──
    app.use(verifyEmailResultRouter); // GET /verify-email/result

    // ── Feature routes (added as tickets are implemented) ────────
    app.use('/api/properties', propertiesRouter);
    app.use('/api/upload', uploadRouter);
    app.use('/api/bookings', bookingsRouter);
    app.use('/api/feedback', feedbackRouter);
    app.use('/api/tickets', ticketsRouter);
    app.use('/api/pricing', pricingRouter);
    app.use('/api/users', usersRouter);
    // Order matters: adminRouter's router-level guard runs for EVERY path under
    // /api/admin, so the more specific ticket-routing mount has to come first or
    // it never gets reached. The two now require different roles — routing config
    // is ADMIN, the dashboard stats are MANAGER — which is what makes this bite.
    app.use('/api/admin/ticket-routing', ticketRoutingRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/invitations', invitationsPublicRouter);
    app.use('/api/me', meRouter);
}
