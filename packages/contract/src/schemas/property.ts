import { z } from 'zod';

// --- Enums ---

export const PropertyTypeEnum = z.enum(['APARTMENT', 'HOUSE', 'HOTEL']);

// Live availability shown on the home board: a property is BOOKED when a non-cancelled
// booking covers today (half-open [checkIn, checkOut)), otherwise AVAILABLE.
export const AvailabilityStatusEnum = z.enum(['AVAILABLE', 'BOOKED']);

// --- Schemas ---

export const PropertySchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    type: PropertyTypeEnum,
    city: z.string().min(1),
    address: z.string().min(1),
    nightlyPrice: z.number().positive(),
    minNightlyPrice: z.number().positive().nullable().optional(),
    maxNightlyPrice: z.number().positive().nullable().optional(),
    maxGuests: z.number().int().positive(),
    amenities: z.array(z.string()),
    photos: z.array(z.string().url()),
    // Better Auth user IDs are not UUIDs — accept any non-empty string. Backend
    // re-validates against the users table (existence + role + alive).
    managerId: z.string().min(1).nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
});

export const CreatePropertySchema = PropertySchema.omit({
    id: true,
    photos: true,
    createdAt: true,
    updatedAt: true
}).extend({
    photos: z.array(z.string().url()).max(10).default([]),
    maxGuests: z.number().int().positive().max(20).default(4)
});

// Bound cross-checks (min ≤ base ≤ max) live in checkPriceBounds below, not in a Zod
// refinement — update must read persisted values to validate partial payloads correctly.
export const UpdatePropertySchema = CreatePropertySchema.partial();

/**
 * The single price-bounds rule: min ≤ base ≤ max. Returns an error message, or
 * null when valid.
 *
 * Deliberately a plain function, not a Zod refinement. `CreatePropertySchema` is
 * consumed by `.partial()` (UpdatePropertySchema), `.omit()` (the frontend form
 * resolver) and zod-to-openapi — a `superRefine` would return a ZodEffects and
 * break all three. Update also needs to check *merged* persisted values, which a
 * refinement cannot see.
 */
export function checkPriceBounds(p: {
    nightlyPrice: number;
    minNightlyPrice?: number | null;
    maxNightlyPrice?: number | null;
}): string | null {
    const { nightlyPrice: base, minNightlyPrice: min, maxNightlyPrice: max } = p;
    if (min != null && min > base) return 'minNightlyPrice must not exceed nightlyPrice';
    if (max != null && max < base) return 'maxNightlyPrice must not be below nightlyPrice';
    if (min != null && max != null && min > max) return 'minNightlyPrice must not exceed maxNightlyPrice';
    return null;
}

export const PropertyAvailabilityStatusSchema = z.object({
    id: z.string().min(1),
    status: AvailabilityStatusEnum
});

/** A booked span — half-open [checkIn, checkOut): the check-out day is free. */
export const BookedRangeSchema = z.object({
    checkIn: z.string(),
    checkOut: z.string()
});

/**
 * Per-property availability for a specific search window, used to annotate list
 * cards. `blockedRanges` are the overlapping non-cancelled bookings, clipped to
 * the queried window; `available` is true only when there are none.
 */
export const PropertyRangeAvailabilitySchema = z.object({
    id: z.string().min(1),
    available: z.boolean(),
    blockedRanges: z.array(BookedRangeSchema)
});

export const PropertySortField = z.enum(['title', 'city', 'basePrice', 'createdAt']);
export const PropertySortOrder = z.enum(['asc', 'desc']);

export const PropertyFilterSchema = z.object({
    city: z.string().optional(),
    type: PropertyTypeEnum.optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    amenities: z.array(z.string()).optional(),
    sort: PropertySortField.optional(),
    order: PropertySortOrder.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
});

/**
 * Body for handing a property to another manager. Used by both the voluntary
 * transfer (a manager gives away a property they own) and, indirectly, by the
 * successor flow when an admin removes a manager.
 */
export const TransferPropertySchema = z.object({
    // Better Auth ids are random strings, not uuids — never validate as .uuid() here.
    managerId: z.string().min(1)
});

// --- Types ---

export type Property = z.infer<typeof PropertySchema>;
export type TransferProperty = z.infer<typeof TransferPropertySchema>;
export type CreateProperty = z.infer<typeof CreatePropertySchema>;
export type UpdateProperty = z.infer<typeof UpdatePropertySchema>;
export type PropertyFilter = z.infer<typeof PropertyFilterSchema>;
export type PropertyType = z.infer<typeof PropertyTypeEnum>;
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusEnum>;
export type PropertyAvailabilityStatus = z.infer<typeof PropertyAvailabilityStatusSchema>;
export type BookedRange = z.infer<typeof BookedRangeSchema>;
export type PropertyRangeAvailability = z.infer<typeof PropertyRangeAvailabilitySchema>;
export type PropertySortFieldValue = z.infer<typeof PropertySortField>;
export type PropertySortOrderValue = z.infer<typeof PropertySortOrder>;
