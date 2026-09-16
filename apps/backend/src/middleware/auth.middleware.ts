import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { db } from '../config/database.js';

/**
 * Extracts session from cookie via Better Auth.
 * Attaches `req.user` and `req.session` on success.
 * Returns 401 if no valid session.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });

        if (!session) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
                statusCode: 401
            });
            return;
        }

        // Better Auth's session.user doesn't carry deletedAt — re-check here so soft-deleted users
        // can't authenticate via a session that was issued before soft-delete (or created concurrently).
        const fresh = await db.user.findUnique({
            where: { id: session.user.id },
            select: { deletedAt: true }
        });
        if (!fresh || fresh.deletedAt) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Account is no longer active',
                statusCode: 401
            });
            return;
        }

        req.user = { ...session.user, role: session.user.role as UserRole };
        req.session = session.session;
        next();
    } catch {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid session',
            statusCode: 401
        });
    }
}

/**
 * Like authMiddleware, but never rejects the request. Attaches `req.user`
 * and `req.session` if a valid session is present, otherwise calls next()
 * with no user. Use for endpoints that are public but change behaviour
 * when an authenticated user is recognised (e.g. role-scoped list views).
 *
 * Currently unused: the app is gated, so every route requires a session.
 * Kept because it is the right tool if an endpoint is ever ungated again.
 */
export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });
        if (session) {
            const fresh = await db.user.findUnique({
                where: { id: session.user.id },
                select: { deletedAt: true }
            });
            if (fresh && !fresh.deletedAt) {
                req.user = { ...session.user, role: session.user.role as UserRole };
                req.session = session.session;
            }
        }
    } catch {
        // Ignore — request continues as anonymous.
    }
    next();
}

/**
 * Must be used AFTER authMiddleware in the middleware chain.
 * Checks that the authenticated user has ADMIN role.
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required',
            statusCode: 403
        });
        return;
    }
    next();
}

/**
 * Must be used AFTER authMiddleware in the middleware chain.
 * Checks that the authenticated user is staff of either kind.
 *
 * Deliberately narrow in use: this is for lookups both roles legitimately need —
 * currently only the manager roster, which feeds the ADMIN routing-config and
 * successor pickers as well as the MANAGER transfer and reassign pickers.
 * It grants no operational access; do NOT reach for it to re-admit admins to
 * property, booking, ticket, feedback or pricing routes.
 */
export function staffMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Staff access required',
            statusCode: 403
        });
        return;
    }
    next();
}

/**
 * Must be used AFTER authMiddleware in the middleware chain.
 * Checks that the authenticated user has MANAGER role.
 *
 * ADMIN is deliberately NOT admitted. Admins hold a pure user-administration
 * role with no operational access to properties, bookings, tickets, feedback or
 * pricing. See docs/plans/2026-07-28-admin-role-narrowing-design.md.
 */
export function managerMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (req.user?.role !== 'MANAGER') {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Manager access required',
            statusCode: 403
        });
        return;
    }
    next();
}
