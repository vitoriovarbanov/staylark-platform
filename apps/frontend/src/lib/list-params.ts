// apps/frontend/src/lib/list-params.ts

/**
 * Turn a filters object into a query string ("?a=1&b=2"), skipping
 * undefined / null / empty-string / false values. Booleans that are true
 * serialize as "true". Returns "" when nothing is set.
 */
export function buildListParams(filters: Record<string, unknown>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '' || value === false) continue;
        params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}
