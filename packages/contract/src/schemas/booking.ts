import { z } from 'zod';
import { PaginationSchema, sortSchema } from './list-query.js';
import { PriceBreakdownNightSchema } from './pricing.js';

// --- Enums ---

export const BookingStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED']);

export const CancellationReasonEnum = z.enum(['MANUAL_GUEST', 'MANUAL_ADMIN', 'AUTO_EXPIRED_NO_CONFIRMATION']);

// --- Schemas ---

export const BookingSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    propertyId: z.string().uuid(),
    checkIn: z.string().date(),
    checkOut: z.string().date(),
    guests: z.number().int().positive(),
    totalPrice: z.number().positive(),
    priceBreakdown: z.array(PriceBreakdownNightSchema).min(1),
    status: BookingStatusEnum,
    cancellationReason: CancellationReasonEnum.nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
});

export const PendingNearExpiryCountSchema = z.object({
    count: z.number().int().nonnegative()
});

export const CreateBookingSchema = z
    .object({
        propertyId: z.string().uuid(),
        checkIn: z.string().date(),
        checkOut: z.string().date(),
        guests: z.number().int().positive(),
        expectedTotalPrice: z.number().positive().optional()
    })
    .refine(data => data.checkOut > data.checkIn, {
        message: 'Check-out must be after check-in',
        path: ['checkOut']
    });

export const BookingParamsSchema = z.object({
    id: z.string().uuid()
});

/** Public sort fields for GET /api/bookings — shared by the FE SortControl + BE field map. */
export const BOOKING_SORT_FIELDS = ['createdAt', 'checkIn', 'status'] as const;

export const BookingQuerySchema = z
    .object({
        status: BookingStatusEnum.optional(),
        propertyId: z.string().uuid().optional(),
        userId: z.string().optional(),
        guestName: z.string().optional(),
        checkInFrom: z.string().date().optional(),
        checkInTo: z.string().date().optional()
    })
    .merge(PaginationSchema)
    .merge(sortSchema(BOOKING_SORT_FIELDS));

export const BookingConfirmQuerySchema = z.object({
    notify: z
        .union([z.literal('true'), z.literal('false'), z.boolean()])
        .optional()
        .transform(v => v === true || v === 'true')
});

// --- Types ---

export type Booking = z.infer<typeof BookingSchema>;
export type CreateBooking = z.infer<typeof CreateBookingSchema>;
export type BookingStatus = z.infer<typeof BookingStatusEnum>;
export type CancellationReason = z.infer<typeof CancellationReasonEnum>;
export type BookingParams = z.infer<typeof BookingParamsSchema>;
export type BookingQuery = z.infer<typeof BookingQuerySchema>;
export type BookingSortField = (typeof BOOKING_SORT_FIELDS)[number];
export type BookingConfirmQuery = z.infer<typeof BookingConfirmQuerySchema>;
export type PendingNearExpiryCount = z.infer<typeof PendingNearExpiryCountSchema>;

// --- Status groupings (single source of truth for reporting/aggregation) ---
// Used by occupancy, revenue, and booking-count queries so they can't silently
// diverge when the booking lifecycle changes.

/** Stays that occupy a property and count toward total bookings. */
export const BOOKING_STATUSES_OCCUPYING = [
    'CONFIRMED',
    'ACTIVE',
    'COMPLETED'
] as const satisfies readonly BookingStatus[];
/** Live bookings — confirmed or currently in-stay (not yet completed/cancelled). */
export const BOOKING_STATUSES_LIVE = ['CONFIRMED', 'ACTIVE'] as const satisfies readonly BookingStatus[];
/** Revenue is recognised only on completed stays. */
export const BOOKING_STATUS_COMPLETED = 'COMPLETED' as const satisfies BookingStatus;
