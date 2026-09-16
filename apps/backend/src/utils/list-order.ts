// apps/backend/src/utils/list-order.ts

/**
 * Resolve a (sortBy, sortOrder) pair to a Prisma orderBy array.
 * `fieldMap` maps a public sort-field name to a builder so one field can
 * expand to multiple clauses (e.g. enum + nulls handling). When sortBy is
 * absent or unknown, returns `fallback` (the endpoint's default order).
 */
export function buildOrderBy<TOrderBy>(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
    fieldMap: Record<string, (dir: 'asc' | 'desc') => TOrderBy | TOrderBy[]>,
    fallback: TOrderBy[]
): TOrderBy[] {
    if (!sortBy) return fallback;
    const builder = fieldMap[sortBy];
    if (!builder) return fallback;
    const clause = builder(sortOrder);
    return Array.isArray(clause) ? clause : [clause];
}
