import { z } from 'zod';

/** Pagination params shared by every list endpoint. page/limit are always strings on the wire. */
export const PaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * Builds a sort sub-schema constrained to an entity's allowed fields.
 * Each entity exports its own field tuple so the FE control, BE field-map,
 * and validation all share one source of truth.
 */
export const sortSchema = <const T extends readonly [string, ...string[]]>(fields: T) =>
    z.object({
        sortBy: z.enum(fields).optional(),
        sortOrder: z.enum(['asc', 'desc']).default('desc')
    });

export type SortOrder = 'asc' | 'desc';
