/**
 * Pure guard for manager self-service on the routing table.
 *
 * A manager may only add or remove THEMSELVES as a handler for a category.
 * They must never be able to sign another manager up for work, or drop one.
 * Admins are unrestricted — routing is staffing config, which is their domain.
 *
 * Expressed as a set difference rather than a length check: an equal-length
 * swap (drop Yoanna, add Ivan) is exactly the abuse this has to reject, and a
 * count comparison would wave it through.
 */
export function assertSelfOnlyRoutingChange(current: string[], next: string[], actorId: string): void {
    const before = new Set(current);
    const after = new Set(next);

    const touched = [
        ...[...after].filter(id => !before.has(id)), // added
        ...[...before].filter(id => !after.has(id)) // removed
    ];

    const othersTouched = touched.filter(id => id !== actorId);
    if (othersTouched.length > 0) {
        throw new Error('You can only add or remove yourself as a handler');
    }
}
