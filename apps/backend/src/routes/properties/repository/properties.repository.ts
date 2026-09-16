import { Prisma } from '@prisma/client';
import { db } from '../../../config/database.js';
import {
    TICKET_STATUSES_TERMINAL,
    type CreateProperty,
    type UpdateProperty,
    type PropertyFilter,
    type PropertySortFieldValue
} from '@staylark/contract';

const SORT_COLUMN = {
    title: 'title',
    city: 'city',
    basePrice: 'nightlyPrice',
    createdAt: 'createdAt'
} as const satisfies Record<PropertySortFieldValue, keyof Prisma.PropertyOrderByWithRelationInput>;

/** Transform Prisma Property → plain object with correct types for API */
export function serialize(property: Prisma.PropertyGetPayload<object>) {
    return {
        id: property.id,
        title: property.title,
        description: property.description,
        type: property.type,
        city: property.city,
        address: property.address,
        nightlyPrice: property.nightlyPrice.toNumber(),
        minNightlyPrice: property.minNightlyPrice != null ? property.minNightlyPrice.toNumber() : null,
        maxNightlyPrice: property.maxNightlyPrice != null ? property.maxNightlyPrice.toNumber() : null,
        maxGuests: property.maxGuests,
        amenities: property.amenities as string[],
        photos: property.photos,
        managerId: property.managerId,
        deletedAt: property.deletedAt,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt
    };
}

export const propertiesRepository = {
    findMany: async (filters: PropertyFilter, managerId?: string) => {
        const { city, type, minPrice, maxPrice, amenities, page, limit } = filters;
        const sort = filters.sort ?? 'createdAt';
        const order = filters.order ?? 'desc';

        const sortColumn = SORT_COLUMN[sort];
        const sortDirection = order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
        const orderByRaw = Prisma.sql`ORDER BY "${Prisma.raw(sortColumn)}" ${sortDirection}`;

        // When amenities are selected, use raw SQL for OR semantics (PostgreSQL ?| operator).
        // Prisma's array_contains uses AND (all must match); ?| returns rows matching ANY.
        if (amenities?.length) {
            const [properties, countResult] = await Promise.all([
                db.$queryRaw<Array<Prisma.PropertyGetPayload<object>>>`
                    SELECT * FROM "Property"
                    WHERE "deletedAt" IS NULL
                    ${city ? Prisma.sql`AND "city" ILIKE ${'%' + city + '%'}` : Prisma.empty}
                    ${type ? Prisma.sql`AND "type" = ${type}::"PropertyType"` : Prisma.empty}
                    ${minPrice !== undefined ? Prisma.sql`AND "nightlyPrice" >= ${minPrice}` : Prisma.empty}
                    ${maxPrice !== undefined ? Prisma.sql`AND "nightlyPrice" <= ${maxPrice}` : Prisma.empty}
                    ${managerId ? Prisma.sql`AND ("managerId" = ${managerId} OR "managerId" IS NULL)` : Prisma.empty}
                    AND amenities ?| ${amenities}
                    ${orderByRaw}
                    OFFSET ${(page - 1) * limit}
                    LIMIT ${limit}
                `,
                db.$queryRaw<[{ count: bigint }]>`
                    SELECT COUNT(*) as count FROM "Property"
                    WHERE "deletedAt" IS NULL
                    ${city ? Prisma.sql`AND "city" ILIKE ${'%' + city + '%'}` : Prisma.empty}
                    ${type ? Prisma.sql`AND "type" = ${type}::"PropertyType"` : Prisma.empty}
                    ${minPrice !== undefined ? Prisma.sql`AND "nightlyPrice" >= ${minPrice}` : Prisma.empty}
                    ${maxPrice !== undefined ? Prisma.sql`AND "nightlyPrice" <= ${maxPrice}` : Prisma.empty}
                    ${managerId ? Prisma.sql`AND ("managerId" = ${managerId} OR "managerId" IS NULL)` : Prisma.empty}
                    AND amenities ?| ${amenities}
                `
            ]);

            return {
                data: properties.map(serialize),
                total: Number(countResult[0].count),
                page,
                limit
            };
        }

        const nightlyPrice: Prisma.PropertyWhereInput['nightlyPrice'] =
            minPrice !== undefined || maxPrice !== undefined
                ? {
                      ...(minPrice !== undefined && { gte: minPrice }),
                      ...(maxPrice !== undefined && { lte: maxPrice })
                  }
                : undefined;

        const where: Prisma.PropertyWhereInput = {
            deletedAt: null,
            ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
            ...(type && { type }),
            ...(nightlyPrice && { nightlyPrice }),
            // A manager sees their own portfolio PLUS any unassigned property, so
            // legacy orphans stay claimable. Nothing in the current flows creates one
            // — removing a manager always names a successor — but pre-existing rows
            // would otherwise be invisible to every role and unrecoverable.
            ...(managerId && { OR: [{ managerId }, { managerId: null }] })
        };

        const [properties, total] = await Promise.all([
            db.property.findMany({
                where,
                orderBy: { [SORT_COLUMN[sort]]: order },
                skip: (page - 1) * limit,
                take: limit
            }),
            db.property.count({ where })
        ]);

        return { data: properties.map(serialize), total, page, limit };
    },

    findById: async (id: string) => {
        const property = await db.property.findFirst({
            where: { id, deletedAt: null }
        });
        return property ? serialize(property) : null;
    },

    create: async (data: CreateProperty) => {
        const property = await db.property.create({
            data: {
                ...data,
                nightlyPrice: data.nightlyPrice,
                amenities: data.amenities
            }
        });
        return serialize(property);
    },

    update: async (id: string, data: UpdateProperty) => {
        const property = await db.property.update({
            where: { id, deletedAt: null },
            data: {
                ...data,
                ...(data.nightlyPrice !== undefined && {
                    nightlyPrice: data.nightlyPrice
                }),
                ...(data.amenities !== undefined && { amenities: data.amenities })
            }
        });
        return serialize(property);
    },

    findDistinctAmenities: async (): Promise<string[]> => {
        const result = await db.$queryRaw<{ amenity: string }[]>`
            SELECT DISTINCT jsonb_array_elements_text(amenities) AS amenity
            FROM "Property"
            WHERE "deletedAt" IS NULL
            ORDER BY amenity
        `;
        return result.map(r => r.amenity);
    },

    findDistinctCities: async (): Promise<string[]> => {
        const result = await db.$queryRaw<{ city: string }[]>`
            SELECT DISTINCT "city" FROM "Property"
            WHERE "deletedAt" IS NULL
            ORDER BY "city"
        `;
        return result.map(r => r.city);
    },

    findBookedDateRanges: async (propertyId: string) => {
        const bookings = await db.booking.findMany({
            where: {
                propertyId,
                status: { notIn: ['CANCELLED'] },
                checkOut: { gte: new Date() }
            },
            select: {
                checkIn: true,
                checkOut: true
            },
            orderBy: { checkIn: 'asc' }
        });

        return bookings.map(b => ({
            checkIn: b.checkIn.toISOString().split('T')[0],
            checkOut: b.checkOut.toISOString().split('T')[0]
        }));
    },

    /**
     * Of the given property ids, return those booked tonight: a non-cancelled booking
     * covering today under half-open [checkIn, checkOut) semantics (checkout day is free).
     * Uses CURRENT_DATE so the comparison is done in DB date space, matching the DATE columns.
     */
    /**
     * Non-cancelled bookings for the given properties that overlap [checkIn, checkOut).
     * Half-open overlap (checkout day is free): a booking blocks the window when
     * booking.checkIn < window.checkOut AND booking.checkOut > window.checkIn —
     * the same test the booking-conflict guard uses on the write path.
     */
    findOverlappingBookings: async (
        propertyIds: string[],
        checkIn: string,
        checkOut: string
    ): Promise<{ propertyId: string; checkIn: string; checkOut: string }[]> => {
        if (propertyIds.length === 0) return [];
        const rows = await db.$queryRaw<{ propertyId: string; checkIn: Date; checkOut: Date }[]>`
            SELECT "propertyId", "checkIn", "checkOut" FROM "Booking"
            WHERE "propertyId" IN (${Prisma.join(propertyIds)})
              AND status != 'CANCELLED'
              AND "deletedAt" IS NULL
              AND "checkIn" < ${checkOut}::date
              AND "checkOut" > ${checkIn}::date
            ORDER BY "checkIn" ASC
        `;
        return rows.map(r => ({
            propertyId: r.propertyId,
            checkIn: r.checkIn.toISOString().split('T')[0] as string,
            checkOut: r.checkOut.toISOString().split('T')[0] as string
        }));
    },

    findBookedTonightPropertyIds: async (propertyIds: string[]): Promise<string[]> => {
        if (propertyIds.length === 0) return [];
        const rows = await db.$queryRaw<{ propertyId: string }[]>`
            SELECT DISTINCT "propertyId" FROM "Booking"
            WHERE "propertyId" IN (${Prisma.join(propertyIds)})
              AND status != 'CANCELLED'
              AND "deletedAt" IS NULL
              AND "checkIn" <= CURRENT_DATE
              AND "checkOut" > CURRENT_DATE
        `;
        return rows.map(r => r.propertyId);
    },

    softDelete: async (id: string) => {
        await db.property.update({
            where: { id, deletedAt: null },
            data: { deletedAt: new Date() }
        });
    },

    /**
     * Moves a property to a new manager together with the state that only makes
     * sense alongside it. One transaction — a partial move would leave open
     * tickets assigned to someone with no access to the property.
     *
     * `fromManagerId` is null when claiming an unassigned property, in which case
     * there are no outgoing assignments to move.
     */
    transferManager: async (propertyId: string, fromManagerId: string | null, toManagerId: string) => {
        return db.$transaction(async tx => {
            const updated = await tx.property.update({
                where: { id: propertyId },
                data: { managerId: toManagerId, previousManagerId: null }
            });

            if (fromManagerId) {
                // Open tickets follow the property; terminal ones keep their historical
                // assignee as a record of who actually resolved them.
                await tx.ticket.updateMany({
                    where: {
                        propertyId,
                        assignedToId: fromManagerId,
                        deletedAt: null,
                        status: { notIn: [...TICKET_STATUSES_TERMINAL] }
                    },
                    data: { assignedToId: toManagerId }
                });
            }

            return serialize(updated);
        });
    }
};
