import { z } from 'zod';
import { registry } from './registry.js';

/** Bearer security scheme — drives the Swagger UI "Authorize" button. */
registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'session-token',
    description:
        'Better Auth session token. Obtain via `POST /api/auth/sign-in/email`, then paste the returned `token` here.'
});

/** Normalized error envelope — matches error.middleware.ts output exactly. */
export const ErrorResponseSchema = registry.register(
    'ErrorResponse',
    z
        .object({
            error: z.string(),
            message: z.string(),
            statusCode: z.number(),
            errorCode: z.string().optional(),
            details: z.unknown().optional()
        })
        .openapi({
            example: {
                error: 'Validation Error',
                message: 'guests: Number must be greater than 0',
                statusCode: 400
            }
        })
);

/** Wrap a schema as an application/json content object. */
export function jsonOf(schema: z.ZodTypeAny) {
    return { 'application/json': { schema } };
}

/** Zod model of contract's PaginatedResponse<T> ({ data, total, page, limit }). */
export function paginated(itemSchema: z.ZodTypeAny) {
    return z.object({
        data: z.array(itemSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number()
    });
}

type ErrorCode = 400 | 401 | 403 | 404 | 409;

const ALL_ERRORS: Record<ErrorCode, { description: string; content: ReturnType<typeof jsonOf> }> = {
    400: { description: 'Validation error', content: jsonOf(ErrorResponseSchema) },
    401: { description: 'Not authenticated', content: jsonOf(ErrorResponseSchema) },
    403: { description: 'Forbidden — insufficient role', content: jsonOf(ErrorResponseSchema) },
    404: { description: 'Resource not found', content: jsonOf(ErrorResponseSchema) },
    409: { description: 'Conflict', content: jsonOf(ErrorResponseSchema) }
};

/** Pick a subset of standard error responses to spread into an operation's `responses`. */
export function errors(...codes: ErrorCode[]) {
    return Object.fromEntries(codes.map(c => [c, ALL_ERRORS[c]]));
}
