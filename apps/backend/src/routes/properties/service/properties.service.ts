import { propertiesRepository } from '../repository/properties.repository.js';
import { pricingService } from '../../pricing/service/pricing.service.js';
import { db } from '../../../config/database.js';
import { NotFoundError, AppError, ForbiddenError } from '../../../utils/errors.js';
import { runAutoTransitions } from '../../../services/bookings/auto-transitions.js';
import { toAvailabilityStatuses } from './availability-status.js';
import { checkPriceBounds } from '@staylark/contract';
import type {
    CreateProperty,
    UpdateProperty,
    PropertyFilter,
    PropertyRangeAvailability,
    BookedRange
} from '@staylark/contract';

const PRICE_FIELDS = ['nightlyPrice', 'minNightlyPrice', 'maxNightlyPrice'] as const;

/**
 * Validate that `managerId` (when set) points to an alive MANAGER.
 * ADMINs are NOT valid managers — they hold no operational role.
 * Pass-through for `null` (unassigning) and `undefined` (not touched).
 */
async function assertValidManager(managerId: string | null | undefined): Promise<void> {
    if (managerId == null) return;
    const user = await db.user.findFirst({
        where: { id: managerId, deletedAt: null },
        select: { role: true }
    });
    if (!user) throw new AppError('Manager user not found', 400);
    if (user.role !== 'MANAGER') {
        throw new AppError('Selected user is not a manager', 400);
    }
}

/**
 * Throws unless `actorId` manages the given alive property. The single
 * authorisation primitive for every property write — a manager acts only on
 * their own portfolio.
 */
async function assertManages(propertyId: string, actorId: string): Promise<void> {
    const owned = await db.property.findFirst({
        where: { id: propertyId, managerId: actorId, deletedAt: null },
        select: { id: true }
    });
    if (!owned) throw new ForbiddenError('You do not manage this property');
}

export const propertiesService = {
    list: async (filters: PropertyFilter, viewer?: { id: string; role: string }) => {
        const managerId = viewer?.role === 'MANAGER' ? viewer.id : undefined;
        return propertiesRepository.findMany(filters, managerId);
    },

    getById: async (id: string) => {
        const property = await propertiesRepository.findById(id);
        if (!property) throw new NotFoundError('Property not found');
        return property;
    },

    /**
     * Creates a property owned by its creator. Any managerId in the payload is
     * ignored — a manager can only create properties for themselves, and hands
     * one over afterwards via `transfer`.
     */
    create: async (data: CreateProperty, actorId: string) => {
        const boundsError = checkPriceBounds(data);
        if (boundsError) throw new AppError(boundsError, 400);
        return propertiesRepository.create({ ...data, managerId: actorId });
    },

    update: async (id: string, data: UpdateProperty, actorId: string) => {
        await assertManages(id, actorId);
        const existing = await propertiesService.getById(id);

        if (data.managerId !== undefined) await assertValidManager(data.managerId);

        // Re-validate bounds against persisted values: schema refinements only see fields present in the payload.
        const effectiveBase = data.nightlyPrice ?? existing.nightlyPrice;
        const effectiveMin = data.minNightlyPrice !== undefined ? data.minNightlyPrice : existing.minNightlyPrice;
        const effectiveMax = data.maxNightlyPrice !== undefined ? data.maxNightlyPrice : existing.maxNightlyPrice;

        const boundsError = checkPriceBounds({
            nightlyPrice: effectiveBase,
            minNightlyPrice: effectiveMin,
            maxNightlyPrice: effectiveMax
        });
        if (boundsError) throw new AppError(boundsError, 400);

        const updated = await propertiesRepository.update(id, data);

        // Bounds and base price are pricing-engine inputs — stale cache could violate admin-set bounds.
        if (PRICE_FIELDS.some(f => data[f] !== undefined)) {
            pricingService.invalidateCache(id);
        }

        return updated;
    },

    getAmenities: async () => {
        return propertiesRepository.findDistinctAmenities();
    },

    getCities: async () => {
        return propertiesRepository.findDistinctCities();
    },

    getAvailability: async (id: string) => {
        // Flush stale PENDINGs so abandoned bookings don't falsely block dates.
        await runAutoTransitions();

        const property = await propertiesRepository.findById(id);
        if (!property) throw new NotFoundError('Property not found');
        return propertiesRepository.findBookedDateRanges(id);
    },

    /** Live availability status per requested property id, for the home board. */
    getAvailabilityStatuses: async (ids: string[]) => {
        if (ids.length === 0) return [];
        // Flush stale PENDINGs so abandoned holds don't show a property as BOOKED.
        await runAutoTransitions();
        const bookedTonight = new Set(await propertiesRepository.findBookedTonightPropertyIds(ids));
        return toAvailabilityStatuses(ids, bookedTonight);
    },

    /**
     * Per-property availability for a search window, for annotating list cards.
     * Returns one entry per requested id with the overlapping booked ranges
     * clipped to [checkIn, checkOut). `available` is true when there are none.
     */
    getRangeAvailability: async (
        ids: string[],
        checkIn: string,
        checkOut: string
    ): Promise<PropertyRangeAvailability[]> => {
        if (ids.length === 0) return [];
        // Flush stale PENDINGs so abandoned holds don't falsely block dates.
        await runAutoTransitions();

        const overlaps = await propertiesRepository.findOverlappingBookings(ids, checkIn, checkOut);

        const byProperty = new Map<string, BookedRange[]>();
        for (const o of overlaps) {
            // Clip to the queried window so the card shows only the days the guest
            // searched for that are taken. YYYY-MM-DD compares lexicographically.
            const clipped: BookedRange = {
                checkIn: o.checkIn < checkIn ? checkIn : o.checkIn,
                checkOut: o.checkOut > checkOut ? checkOut : o.checkOut
            };
            const list = byProperty.get(o.propertyId) ?? [];
            list.push(clipped);
            byProperty.set(o.propertyId, list);
        }

        return ids.map(id => {
            const blockedRanges = byProperty.get(id) ?? [];
            return { id, available: blockedRanges.length === 0, blockedRanges };
        });
    },

    remove: async (id: string, actorId: string) => {
        await assertManages(id, actorId);
        await propertiesService.getById(id);
        return propertiesRepository.softDelete(id);
    },

    /**
     * Hands a property to another manager. Everything scoped to the property moves
     * in one transaction — the property itself and the open tickets that were
     * assigned to the outgoing manager. A partial transfer would strand tickets
     * with someone who can no longer see the property.
     *
     * Pricing rules are keyed by propertyId, so they follow the property with no
     * work here. Terminal tickets keep their historical assignee as a record.
     */
    transfer: async (propertyId: string, newManagerId: string, actorId: string) => {
        await assertManages(propertyId, actorId);
        if (newManagerId === actorId) throw new AppError('Property is already managed by you', 400);
        await assertValidManager(newManagerId);

        return propertiesRepository.transferManager(propertyId, actorId, newManagerId);
    },

    /**
     * Claims a property left without a manager. Only reachable for legacy rows
     * orphaned before a successor became mandatory on manager removal — nothing
     * in the current flows can produce one.
     */
    claim: async (propertyId: string, actorId: string) => {
        const property = await db.property.findFirst({
            where: { id: propertyId, managerId: null, deletedAt: null },
            select: { id: true }
        });
        if (!property) throw new NotFoundError('No unassigned property with that id');

        return propertiesRepository.transferManager(propertyId, null, actorId);
    }
};
