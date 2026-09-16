import type { PropertyAvailabilityStatus } from '@staylark/contract';

/**
 * Map requested property ids to a live availability status.
 * A property is BOOKED when its id is in `bookedTonight` (a non-cancelled booking
 * covers today), otherwise AVAILABLE. Order and cardinality of `requestedIds` are preserved.
 */
export function toAvailabilityStatuses(
    requestedIds: string[],
    bookedTonight: Set<string>
): PropertyAvailabilityStatus[] {
    return requestedIds.map(id => ({
        id,
        status: bookedTonight.has(id) ? 'BOOKED' : 'AVAILABLE'
    }));
}
