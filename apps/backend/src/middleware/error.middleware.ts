import type { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Global error handler — must be registered LAST in the middleware chain.
 * Catches all errors thrown by route handlers and middleware.
 *
 * Response shape matches ApiError from @staylark/contract:
 *   { error: string, message: string, statusCode: number }
 */
export function errorMiddleware(
    err: Error,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void {
    // ── Multer errors (file upload) ─────────────────────────────
    if (err instanceof MulterError) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        res.status(status).json({
            error: err.code === 'LIMIT_FILE_SIZE' ? 'Payload Too Large' : 'Bad Request',
            message: err.message,
            statusCode: status
        });
        return;
    }

    // ── Prisma known errors ──────────────────────────────────────
    if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const conflict = new ConflictError('A record with that value already exists');
            res.status(conflict.statusCode).json({
                error: 'Conflict',
                message: conflict.message,
                statusCode: conflict.statusCode
            });
            return;
        }
        if (err.code === 'P2025') {
            const notFound = new NotFoundError('Record not found');
            res.status(notFound.statusCode).json({
                error: 'Not Found',
                message: notFound.message,
                statusCode: notFound.statusCode
            });
            return;
        }
    }

    // ── Validation errors (Zod) ──────────────────────────────────
    if (err instanceof ValidationError) {
        res.status(err.statusCode).json({
            error: 'Validation Error',
            message: err.details.map(d => (d.path ? `${d.path}: ${d.message}` : d.message)).join(', '),
            statusCode: err.statusCode,
            details: err.details
        });
        return;
    }

    // ── Known operational errors ─────────────────────────────────
    if (err instanceof AppError) {
        // Non-operational AppErrors signal programmer error / unexpected state —
        // surface them at fatal level. Every current error class is operational.
        if (!err.isOperational) {
            logger.fatal({ err }, 'Non-operational error');
        }
        const body: {
            error: string;
            message: string;
            statusCode: number;
            errorCode?: string;
            details?: unknown;
        } = {
            error: err.constructor.name.replace('Error', ''),
            message: err.message,
            statusCode: err.statusCode
        };
        if (err.errorCode) body.errorCode = err.errorCode;
        if (err.details !== undefined) body.details = err.details;
        res.status(err.statusCode).json(body);
        return;
    }

    // ── Unexpected errors ────────────────────────────────────────
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
        error: 'Internal Server Error',
        message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
        statusCode: 500
    });
}
