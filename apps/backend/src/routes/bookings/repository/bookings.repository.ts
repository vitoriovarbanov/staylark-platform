import { Prisma } from '@prisma/client';
import { db } from '../../../config/database.js';
import { env } from '../../../config/env.js';
import { ConflictError } from '../../../utils/errors.js';
import { PriceBreakdownNightSchema } from '@staylark/contract';
import type { BookingQuery, BookingSortField, CancellationReason, PriceBreakdownNight } from '@staylark/contract';
import { buildOrderBy } from '../../../utils/list-order.js';

type BookingWithProperty = Prisma.BookingGetPayload<{ include: { property: true } }>;
type BookingWithPropertyAndUser = Prisma.BookingGetPayload<{
    include: { property: true; user: { select: { id: true; name: true; email: true } } };
}>;
type BookingPayload = Prisma.BookingGetPayload<object>;

/** Transform Prisma Booking → plain object with correct types for API */
function serialize(booking: BookingPayload) {
    return {
        ...booking,
        checkIn: booking.checkIn.toISOString().split('T')[0],
        checkOut: booking.checkOut.toISOString().split('T')[0],
        totalPrice: booking.totalPrice.toNumber(),
        priceBreakdown: PriceBreakdownNightSchema.array().min(1).parse(booking.priceBreakdown)
    };
}

function serializeWithProperty(booking: BookingWithProperty) {
    return {
        ...serialize(booking),
        property: {
            id: booking.property.id,
            title: booking.property.title,
            city: booking.property.city,
            type: booking.property.type,
            nightlyPrice: booking.property.nightlyPrice.toNumber(),
            photos: booking.property.photos
        }
    };
}

function serializeWithPropertyAndUser(booking: BookingWithPropertyAndUser) {
    return {
        ...serializeWithProperty(booking),
        user: {
            id: booking.user.id,
            name: booking.user.name,
            email: booking.user.email
        }
    };
}

const BOOKING_SORT: Record<
    BookingSortField,
    (dir: 'asc' | 'desc') => Prisma.BookingOrderByWithRelationInput | Prisma.BookingOrderByWithRelationInput[]
> = {
    createdAt: dir => ({ createdAt: dir }),
    checkIn: dir => ({ checkIn: dir }),
    status: dir => ({ status: dir })
};

// Preserves today's behavior when no sort is requested.
const BOOKING_SORT_FALLBACK: Prisma.BookingOrderByWithRelationInput[] = [{ createdAt: 'desc' }];

export type AutoExpiredBookingRow = {
    id: string;
    userId: string;
    userEmail: string;
    propertyId: string;
    propertyTitle: string;
    checkIn: string;
    checkOut: string;
};

export const bookingsRepository = {
    /**
     * Concurrency-safe booking creation.
     * Uses SELECT ... FOR UPDATE inside an interactive transaction
     * to prevent double-booking the same dates.
     */
    createWithAvailabilityCheck: async (data: {
        userId: string;
        propertyId: string;
        checkIn: string;
        checkOut: string;
        guests: number;
        totalPrice: number;
        priceBreakdown: PriceBreakdownNight[];
    }) => {
        return db.$transaction(
            async tx => {
                // Lock all non-cancelled, non-deleted bookings that overlap requested dates
                const conflicts = await tx.$queryRaw<{ id: string }[]>`
                    SELECT id FROM "Booking"
                    WHERE "propertyId" = ${data.propertyId}
                    AND status != 'CANCELLED'
                    AND "deletedAt" IS NULL
                    AND "checkIn" < ${data.checkOut}::date
                    AND "checkOut" > ${data.checkIn}::date
                    FOR UPDATE
                `;

                if (conflicts.length > 0) {
                    throw new ConflictError('Selected dates are unavailable for this property');
                }

                const booking = await tx.booking.create({
                    data: {
                        userId: data.userId,
                        propertyId: data.propertyId,
                        checkIn: new Date(data.checkIn),
                        checkOut: new Date(data.checkOut),
                        guests: data.guests,
                        totalPrice: data.totalPrice,
                        priceBreakdown: data.priceBreakdown as Prisma.InputJsonValue
                    }
                });

                return serialize(booking);
            },
            { timeout: 10000 }
        );
    },

    findById: async (id: string) => {
        const booking = await db.booking.findFirst({
            where: { id, deletedAt: null },
            include: { property: true, user: { select: { id: true, name: true, email: true } } }
        });
        return booking ? serializeWithPropertyAndUser(booking) : null;
    },

    findMany: async (filters: BookingQuery & { userId?: string; managedPropertyIds?: string[] }) => {
        const { status, propertyId, guestName, checkInFrom, checkInTo, userId, managedPropertyIds, page, limit } =
            filters;

        const checkInFilter: Prisma.BookingWhereInput['checkIn'] =
            checkInFrom || checkInTo
                ? {
                      ...(checkInFrom && { gte: new Date(checkInFrom) }),
                      ...(checkInTo && { lte: new Date(checkInTo) })
                  }
                : undefined;

        const where: Prisma.BookingWhereInput = {
            deletedAt: null,
            ...(status && { status }),
            ...(propertyId && { propertyId }),
            ...(checkInFilter && { checkIn: checkInFilter }),
            ...(guestName && {
                user: {
                    name: {
                        contains: guestName,
                        mode: 'insensitive' as const
                    }
                }
            })
        };

        // Three-tier access: user's own, manager's properties, or admin (no filter)
        if (userId && managedPropertyIds) {
            // MANAGER: own bookings OR bookings on managed properties
            where.OR = [{ userId }, { propertyId: { in: managedPropertyIds } }];
        } else if (userId) {
            // USER: own bookings only
            where.userId = userId;
        }
        // ADMIN: no userId filter — sees all

        const [bookings, total] = await Promise.all([
            db.booking.findMany({
                where,
                include: {
                    property: true,
                    user: { select: { id: true, name: true } }
                },
                orderBy: buildOrderBy(filters.sortBy, filters.sortOrder, BOOKING_SORT, BOOKING_SORT_FALLBACK),
                skip: (page - 1) * limit,
                take: limit
            }),
            db.booking.count({ where })
        ]);

        return {
            data: bookings.map(b => ({
                ...serializeWithProperty(b),
                user: { id: b.user.id, name: b.user.name }
            })),
            total,
            page,
            limit
        };
    },

    updateStatus: async (id: string, status: string, cancellationReason?: CancellationReason) => {
        const booking = await db.booking.update({
            where: { id },
            data: {
                status: status as Prisma.BookingUpdateInput['status'],
                ...(cancellationReason !== undefined && {
                    cancellationReason: cancellationReason as Prisma.BookingUpdateInput['cancellationReason']
                })
            },
            include: { property: true }
        });
        return serializeWithProperty(booking);
    },

    /**
     * Optimistic-locked status update. Updates only if the row is still in
     * `fromStatus`. Returns the updated row, or throws ConflictError on no
     * match (race with auto-expire or another admin action).
     */
    updateStatusIf: async (
        id: string,
        fromStatus: string,
        toStatus: string,
        cancellationReason?: CancellationReason
    ) => {
        const result = await db.booking.updateMany({
            where: { id, status: fromStatus as Prisma.BookingWhereInput['status'], deletedAt: null },
            data: {
                status: toStatus as Prisma.BookingUpdateInput['status'],
                ...(cancellationReason !== undefined && {
                    cancellationReason: cancellationReason as Prisma.BookingUpdateInput['cancellationReason']
                })
            }
        });

        if (result.count === 0) {
            throw new ConflictError(
                `Booking status changed concurrently; expected ${fromStatus} but it no longer matches`
            );
        }

        const booking = await db.booking.findFirst({
            where: { id, deletedAt: null },
            include: { property: true }
        });
        if (!booking) {
            throw new ConflictError('Booking disappeared after update');
        }
        return serializeWithProperty(booking);
    },

    /**
     * Bulk auto-transition — runs inside a single transaction, order:
     *   1. PENDING → CANCELLED (no confirmation in time)
     *   2. CONFIRMED → ACTIVE (check-in reached)
     *   3. ACTIVE → COMPLETED (check-out passed)
     *
     * Returns the set of bookings that were auto-expired so the caller can
     * notify those guests by email AFTER the transaction commits. Email
     * sending inside the transaction would hold the DB connection for the
     * Resend round-trip and risk emailing-then-rollback.
     */
    autoTransitionStatuses: async (): Promise<AutoExpiredBookingRow[]> => {
        return db.$transaction(async tx => {
            const expired = await tx.$queryRaw<AutoExpiredBookingRow[]>`
                WITH expired AS (
                    UPDATE "Booking"
                    SET status = 'CANCELLED',
                        "cancellationReason" = 'AUTO_EXPIRED_NO_CONFIRMATION',
                        "updatedAt" = now()
                    WHERE status = 'PENDING'
                    AND "deletedAt" IS NULL
                    AND (
                        "checkIn" < CURRENT_DATE
                        OR "createdAt" < now() - (${env.PENDING_EXPIRY_HOURS}::int * INTERVAL '1 hour')
                    )
                    RETURNING id, "userId", "propertyId", "checkIn", "checkOut"
                )
                SELECT e.id,
                       e."userId",
                       u.email AS "userEmail",
                       e."propertyId",
                       p.title AS "propertyTitle",
                       to_char(e."checkIn", 'YYYY-MM-DD') AS "checkIn",
                       to_char(e."checkOut", 'YYYY-MM-DD') AS "checkOut"
                FROM expired e
                JOIN "user" u ON u.id = e."userId"
                JOIN "Property" p ON p.id = e."propertyId"
            `;

            await tx.$executeRaw`
                UPDATE "Booking"
                SET status = 'ACTIVE', "updatedAt" = now()
                WHERE status = 'CONFIRMED'
                AND "deletedAt" IS NULL
                AND "checkIn" <= CURRENT_DATE
            `;
            await tx.$executeRaw`
                UPDATE "Booking"
                SET status = 'COMPLETED', "updatedAt" = now()
                WHERE status = 'ACTIVE'
                AND "deletedAt" IS NULL
                AND "checkOut" < CURRENT_DATE
            `;

            return expired;
        });
    },

    /**
     * Find property IDs managed by a user.
     * Used for MANAGER role access control.
     */
    findManagedPropertyIds: async (managerId: string): Promise<string[]> => {
        const properties = await db.property.findMany({
            where: { managerId, deletedAt: null },
            select: { id: true }
        });
        return properties.map(p => p.id);
    },

    /**
     * Check if a specific booking belongs to properties managed by a user.
     */
    isBookingOnManagedProperty: async (bookingId: string, managerId: string): Promise<boolean> => {
        const booking = await db.booking.findFirst({
            where: { id: bookingId, deletedAt: null },
            include: { property: { select: { managerId: true } } }
        });
        return booking?.property.managerId === managerId;
    },

    /**
     * Count of PENDING bookings whose expiry is within the last 12h of the
     * configured PENDING_EXPIRY_HOURS window — "about to expire." Used by
     * the admin/manager nav badge.
     *
     * Predicate: createdAt between `now - H` and `now - (H - 12)`.
     *   - A row older than `now - H` has already been auto-expired on the
     *     last list query, so it's not counted.
     *   - A row newer than `now - (H - 12)` still has > 12h to live.
     *
     * When `managedPropertyIds` is provided, the count is scoped (for MANAGER).
     * When undefined, ADMIN gets the global count.
     */
    countPendingNearExpiry: async (managedPropertyIds?: string[]): Promise<number> => {
        const hours = env.PENDING_EXPIRY_HOURS;
        const warningWindow = Math.max(hours - 12, 1);
        const now = Date.now();
        const olderThan = new Date(now - warningWindow * 60 * 60 * 1000);
        const newerThan = new Date(now - hours * 60 * 60 * 1000);

        return db.booking.count({
            where: {
                status: 'PENDING',
                deletedAt: null,
                createdAt: { lt: olderThan, gte: newerThan },
                ...(managedPropertyIds && { propertyId: { in: managedPropertyIds } })
            }
        });
    }
};
