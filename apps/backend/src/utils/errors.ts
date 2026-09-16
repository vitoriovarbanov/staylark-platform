import type { ZodError } from 'zod';
import type { ImportRowError } from '@staylark/contract';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly errorCode?: string;
    public readonly details?: unknown;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
    }
}

export class ValidationError extends AppError {
    public readonly details: Array<{ path: string; message: string }>;

    constructor(public readonly zodError: ZodError) {
        super('Validation Error', 400);
        this.details = zodError.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
        }));
    }
}

export class PriceDriftError extends AppError {
    public readonly errorCode = 'PRICE_DRIFT' as const;
    public readonly details: { newTotal: number; expectedTotal: number };

    constructor(newTotal: number, expectedTotal: number) {
        super('Price changed since you started checkout. Confirm to continue.', 409);
        this.details = { newTotal, expectedTotal };
    }
}

/**
 * A bulk property import that was rejected. Carries every problem in the file, so a
 * manager fixes one spreadsheet once rather than discovering errors one upload at a
 * time. Import is all-or-nothing: whenever this is thrown, nothing was written.
 */
export class ImportValidationError extends AppError {
    public readonly errorCode = 'IMPORT_VALIDATION_FAILED' as const;
    public readonly details: { rowCount: number; errors: ImportRowError[] };

    constructor(rowCount: number, errors: ImportRowError[]) {
        super(ImportValidationError.describe(rowCount, errors), 422);
        this.details = { rowCount, errors };
    }

    /**
     * Structural problems — a missing header, an empty file — are reported with no
     * rows at all, and their own message already explains the file. Counting rows
     * there would read "1 of 0 rows are invalid".
     */
    private static describe(rowCount: number, errors: ImportRowError[]): string {
        if (rowCount === 0) {
            const detail = errors[0]?.message ?? 'The file could not be read';
            return `${detail.replace(/\.$/, '')}. No properties were created.`;
        }
        const badRows = new Set(errors.map(e => e.row)).size;
        return `${badRows} of ${rowCount} rows are invalid. No properties were created.`;
    }
}
