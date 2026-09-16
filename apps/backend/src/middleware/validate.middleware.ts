import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors.js';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Validates req[source] against a Zod schema.
 * On success, replaces req[source] with parsed data (strips unknown fields).
 * On failure, throws ValidationError — caught by global error handler.
 */
export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
    return (req: Request, _res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            throw new ValidationError(result.error);
        }
        if (source === 'query') {
            // Express 5: req.query is a read-only getter — override with parsed data
            Object.defineProperty(req, 'query', {
                value: result.data,
                writable: true,
                configurable: true
            });
        } else {
            req[source] = result.data;
        }
        next();
    };
}
