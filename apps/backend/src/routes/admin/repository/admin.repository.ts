import { Prisma } from '@prisma/client';
import {
    type AdminStats,
    type AdminPropertyStats,
    type TicketStats,
    BOOKING_STATUSES_OCCUPYING,
    BOOKING_STATUSES_LIVE,
    BOOKING_STATUS_COMPLETED,
    CRITICAL_TICKET_PRIORITIES
} from '@staylark/contract';
import { db } from '../../../config/database.js';

// Build a SQL enum list (e.g. 'CONFIRMED', 'ACTIVE') from trusted contract
// constants. Values are compile-time enum literals, never user input, so raw
// interpolation is safe — and it preserves the literal-coerced-to-enum form so
// the column's enum index is still usable.
const sqlStatusList = (statuses: readonly string[]) => Prisma.raw(statuses.map(s => `'${s}'`).join(', '));

/**
 * Every export below is scoped to one manager's properties. Callers MUST
 * early-return for an empty id list: Prisma.join throws on an empty array, and an
 * unrestricted query would silently return the whole portfolio — the dangerous
 * failure mode here, because it looks like working code rather than an error.
 */
const EMPTY_STATS: AdminStats = {
    totals: {
        guestsHosted: 0,
        properties: 0,
        activeBookings: 0,
        openTickets: 0,
        revenue: 0,
        avgOccupancy: 0
    },
    occupancyTrend: [],
    recentBookings: [],
    criticalTickets: []
};

const EMPTY_TICKET_STATS: TicketStats = {
    statusCounts: { open: 0, inProgress: 0, resolved: 0, dismissed: 0 },
    urgentOpenCount: 0,
    resolvedInRange: 0,
    avgResolutionHours: null,
    medianResolutionHours: null,
    byPriority: [],
    byCategory: [],
    byAssignee: []
};

interface OccupancyRow {
    month: string;
    occupied_nights: number;
    available_nights: number;
}

interface PropertyStatsRow {
    property_id: string;
    title: string;
    city: string;
    days_in_month: number;
    occupied_nights: number;
    revenue: number;
    completed_nights: number;
    bookings: number;
    active_bookings: number;
}

/**
 * Monthly occupancy for the last 6 months (current month last).
 * Occupied = overlap of CONFIRMED/ACTIVE/COMPLETED stays with each month.
 * Available = (properties existing that month) × days in month.
 * DATE - DATE in Postgres yields integer nights (checkout day not occupied).
 */
async function occupancyTrend(propertyIds: string[]): Promise<AdminStats['occupancyTrend']> {
    const rows = await db.$queryRaw<OccupancyRow[]>`
        WITH months AS (
            SELECT date_trunc('month', d)::date AS month_start
            FROM generate_series(
                date_trunc('month', CURRENT_DATE) - interval '5 months',
                date_trunc('month', CURRENT_DATE),
                interval '1 month'
            ) d
        ),
        bounds AS (
            SELECT month_start,
                   (month_start + interval '1 month')::date AS month_end,
                   EXTRACT(DAY FROM (month_start + interval '1 month' - interval '1 day'))::int AS days_in_month
            FROM months
        )
        SELECT
            to_char(b.month_start, 'YYYY-MM') AS month,
            COALESCE(SUM(
                GREATEST(0, LEAST(bk."checkOut", b.month_end) - GREATEST(bk."checkIn", b.month_start))
            ), 0)::int AS occupied_nights,
            -- Denominator must be scoped too. Counting ALL properties here while the
            -- numerator counts only this manager's occupied nights yields a plausible
            -- but badly wrong percentage that no error would reveal.
            ((SELECT COUNT(*) FROM "Property" p
                WHERE p."deletedAt" IS NULL AND p."createdAt" < b.month_end
                  AND p.id IN (${Prisma.join(propertyIds)})
            ) * b.days_in_month)::int AS available_nights
        FROM bounds b
        LEFT JOIN "Booking" bk
            ON bk."deletedAt" IS NULL
            AND bk.status IN (${sqlStatusList(BOOKING_STATUSES_OCCUPYING)})
            AND bk."propertyId" IN (${Prisma.join(propertyIds)})
            AND bk."checkIn" < b.month_end
            AND bk."checkOut" > b.month_start
        GROUP BY b.month_start, b.month_end, b.days_in_month
        ORDER BY b.month_start;
    `;

    return rows.map(r => ({
        month: r.month,
        occupancy: r.available_nights > 0 ? Math.round((100 * r.occupied_nights) / r.available_nights) : 0
    }));
}

/**
 * Per-property performance: current-month occupancy, completed revenue + ADR,
 * booking counts. One raw query over Property⨝Booking (booking-only, to avoid
 * ticket join fan-out); open-ticket counts are fetched separately and merged.
 */
async function getPropertyStats(propertyIds: string[]): Promise<AdminPropertyStats[]> {
    if (propertyIds.length === 0) return [];

    const [rows, ticketCounts] = await Promise.all([
        db.$queryRaw<PropertyStatsRow[]>`
            WITH bounds AS (
                SELECT date_trunc('month', CURRENT_DATE)::date AS month_start,
                       (date_trunc('month', CURRENT_DATE) + interval '1 month')::date AS month_end,
                       EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day'))::int AS days_in_month
            )
            SELECT
                p.id AS property_id,
                p.title AS title,
                p.city AS city,
                bounds.days_in_month AS days_in_month,
                COALESCE(SUM(
                    CASE WHEN bk.status IN (${sqlStatusList(BOOKING_STATUSES_OCCUPYING)})
                              AND bk."checkIn" < bounds.month_end
                              AND bk."checkOut" > bounds.month_start
                         THEN GREATEST(0, LEAST(bk."checkOut", bounds.month_end) - GREATEST(bk."checkIn", bounds.month_start))
                         ELSE 0 END
                ), 0)::int AS occupied_nights,
                COALESCE(SUM(CASE WHEN bk.status IN (${sqlStatusList([BOOKING_STATUS_COMPLETED])}) THEN bk."totalPrice" ELSE 0 END), 0)::float8 AS revenue,
                COALESCE(SUM(CASE WHEN bk.status IN (${sqlStatusList([BOOKING_STATUS_COMPLETED])}) THEN (bk."checkOut" - bk."checkIn") ELSE 0 END), 0)::int AS completed_nights,
                COUNT(bk.id) FILTER (WHERE bk.status IN (${sqlStatusList(BOOKING_STATUSES_OCCUPYING)}))::int AS bookings,
                COUNT(bk.id) FILTER (WHERE bk.status IN (${sqlStatusList(BOOKING_STATUSES_LIVE)}))::int AS active_bookings
            FROM "Property" p
            CROSS JOIN bounds
            LEFT JOIN "Booking" bk ON bk."propertyId" = p.id AND bk."deletedAt" IS NULL
            WHERE p."deletedAt" IS NULL AND p.id IN (${Prisma.join(propertyIds)})
            GROUP BY p.id, p.title, p.city, bounds.days_in_month
            ORDER BY revenue DESC, p.title ASC;
        `,
        db.ticket.groupBy({
            by: ['propertyId'],
            // Active tickets only — terminal statuses (RESOLVED, DISMISSED) are excluded.
            where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] }, propertyId: { in: propertyIds } },
            _count: { _all: true }
        })
    ]);

    const openTicketsByProperty = new Map(ticketCounts.map(t => [t.propertyId, t._count._all]));

    return rows.map(r => ({
        propertyId: r.property_id,
        title: r.title,
        city: r.city,
        occupancy: r.days_in_month > 0 ? Math.round((100 * r.occupied_nights) / r.days_in_month) : 0,
        revenue: r.revenue,
        adr: r.completed_nights > 0 ? Math.round((r.revenue / r.completed_nights) * 100) / 100 : 0,
        bookings: r.bookings,
        activeBookings: r.active_bookings,
        openTickets: openTicketsByProperty.get(r.property_id) ?? 0
    }));
}

export const adminRepository = {
    getPropertyStats,

    async getStats(propertyIds: string[]): Promise<AdminStats> {
        if (propertyIds.length === 0) return EMPTY_STATS;

        const [guestsHosted, properties, activeBookings, openTickets, revenueAgg, recent, critical, trend] =
            await Promise.all([
                // Distinct guests across this manager's properties. A guest with three
                // bookings counts once; a guest who only booked elsewhere is excluded.
                db.booking
                    .findMany({
                        where: { deletedAt: null, propertyId: { in: propertyIds } },
                        select: { userId: true },
                        distinct: ['userId']
                    })
                    .then(rows => rows.length),
                db.property.count({ where: { deletedAt: null, id: { in: propertyIds } } }),
                db.booking.count({
                    where: {
                        deletedAt: null,
                        status: { in: [...BOOKING_STATUSES_LIVE] },
                        propertyId: { in: propertyIds }
                    }
                }),
                // Active tickets only — terminal statuses (RESOLVED, DISMISSED) are excluded.
                db.ticket.count({
                    where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] }, propertyId: { in: propertyIds } }
                }),
                db.booking.aggregate({
                    _sum: { totalPrice: true },
                    where: { deletedAt: null, status: BOOKING_STATUS_COMPLETED, propertyId: { in: propertyIds } }
                }),
                db.booking.findMany({
                    where: { deletedAt: null, propertyId: { in: propertyIds } },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        checkIn: true,
                        checkOut: true,
                        totalPrice: true,
                        status: true,
                        property: { select: { title: true } },
                        user: { select: { name: true } }
                    }
                }),
                db.ticket.findMany({
                    where: {
                        deletedAt: null,
                        propertyId: { in: propertyIds },
                        // Active tickets only — terminal statuses (RESOLVED, DISMISSED) are excluded.
                        status: { in: ['OPEN', 'IN_PROGRESS'] },
                        // Surface high-urgency tickets: top priorities OR any emergency.
                        // Mirrors isUrgentTicket() so the dashboard never highlights a
                        // ticket it didn't surface (or vice versa).
                        OR: [{ priority: { in: [...CRITICAL_TICKET_PRIORITIES] } }, { category: 'EMERGENCY' }]
                    },
                    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
                    take: 10,
                    select: {
                        id: true,
                        category: true,
                        priority: true,
                        status: true,
                        createdAt: true,
                        property: { select: { title: true } }
                    }
                }),
                occupancyTrend(propertyIds)
            ]);

        return {
            totals: {
                guestsHosted,
                properties,
                activeBookings,
                openTickets,
                revenue: Number(revenueAgg._sum.totalPrice ?? 0),
                avgOccupancy: trend.length > 0 ? trend[trend.length - 1].occupancy : 0
            },
            occupancyTrend: trend,
            recentBookings: recent.map(b => ({
                id: b.id,
                propertyTitle: b.property.title,
                guestName: b.user.name,
                // DATE columns — emit date-only (matches bookings repo) so a
                // midnight-UTC instant can't roll back a day in negative-UTC browsers.
                checkIn: b.checkIn.toISOString().split('T')[0],
                checkOut: b.checkOut.toISOString().split('T')[0],
                totalPrice: Number(b.totalPrice),
                status: b.status
            })),
            criticalTickets: critical.map(t => ({
                id: t.id,
                propertyTitle: t.property.title,
                category: t.category,
                priority: t.priority,
                status: t.status,
                createdAt: t.createdAt.toISOString()
            }))
        };
    },

    async getTicketStats(
        propertyIds: string[],
        startDate?: string,
        endDate?: string,
        propertyId?: string
    ): Promise<TicketStats> {
        if (propertyIds.length === 0) return EMPTY_TICKET_STATS;

        // A caller-supplied propertyId must INTERSECT the manager's scope, never
        // replace it — otherwise passing someone else's property id would read their
        // stats. Narrowing to an id outside the scope yields an empty result.
        const scopedIds = propertyId ? propertyIds.filter(id => id === propertyId) : propertyIds;
        if (scopedIds.length === 0) return EMPTY_TICKET_STATS;

        const startDateObj = startDate ? new Date(`${startDate}T00:00:00.000Z`) : undefined;
        const endDateObj = endDate ? new Date(`${endDate}T23:59:59.999Z`) : undefined;

        // Prisma `where` fragments
        const propertyWhere: Prisma.TicketWhereInput = { propertyId: { in: scopedIds } };
        const activeWhere: Prisma.TicketWhereInput = {
            deletedAt: null,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            ...propertyWhere
        };

        // Raw SQL fragments (values are bound, not interpolated — safe)
        const propertyFrag = Prisma.sql`AND "propertyId" IN (${Prisma.join(scopedIds)})`;
        const startFrag = startDateObj ? Prisma.sql`AND "resolvedAt" >= ${startDateObj}` : Prisma.empty;
        const endFrag = endDateObj ? Prisma.sql`AND "resolvedAt" <= ${endDateObj}` : Prisma.empty;

        const [statusGroups, urgentOpenCount, priorityGroups, categoryGroups, resolutionRows, assigneeRows] =
            await Promise.all([
                // statusCounts — live, all non-deleted (optionally property-scoped)
                db.ticket.groupBy({
                    by: ['status'],
                    where: { deletedAt: null, ...propertyWhere },
                    _count: { _all: true }
                }),
                // urgentOpenCount — active + (CRITICAL or EMERGENCY); mirrors isUrgentTicket()
                // exactly (priority === 'CRITICAL' || category === 'EMERGENCY'), so this KPI
                // never disagrees with the shared row-level urgent highlight.
                db.ticket.count({
                    where: {
                        deletedAt: null,
                        status: { in: ['OPEN', 'IN_PROGRESS'] },
                        OR: [{ priority: 'CRITICAL' }, { category: 'EMERGENCY' }],
                        ...propertyWhere
                    }
                }),
                // byPriority — active backlog
                db.ticket.groupBy({ by: ['priority'], where: activeWhere, _count: { _all: true } }),
                // byCategory — active backlog, category present
                db.ticket.groupBy({
                    by: ['category'],
                    where: { ...activeWhere, category: { not: null } },
                    _count: { _all: true }
                }),
                // overall resolution speed — RESOLVED within range
                db.$queryRaw<Array<{ resolved_count: number; avg_hours: number | null; median_hours: number | null }>>`
                    SELECT
                        COUNT(*)::int AS resolved_count,
                        ROUND(AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600.0)::numeric, 1)::float8 AS avg_hours,
                        ROUND(
                            percentile_cont(0.5) WITHIN GROUP (
                                ORDER BY EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600.0
                            )::numeric, 1
                        )::float8 AS median_hours
                    FROM "Ticket"
                    WHERE "deletedAt" IS NULL AND status = 'RESOLVED' AND "resolvedAt" IS NOT NULL
                      ${propertyFrag} ${startFrag} ${endFrag}
                `,
                // per-assignee — live load + resolved-in-range + avg resolution (names fetched separately)
                db.$queryRaw<
                    Array<{
                        assignee_id: string;
                        open_count: number;
                        in_progress_count: number;
                        resolved_count: number;
                        avg_resolution_hours: number | null;
                    }>
                >`
                    SELECT
                        "assignedToId" AS assignee_id,
                        COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open_count,
                        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress_count,
                        COUNT(*) FILTER (
                            WHERE status = 'RESOLVED' AND "resolvedAt" IS NOT NULL ${startFrag} ${endFrag}
                        )::int AS resolved_count,
                        ROUND(
                            AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600.0) FILTER (
                                WHERE status = 'RESOLVED' AND "resolvedAt" IS NOT NULL ${startFrag} ${endFrag}
                            )::numeric, 1
                        )::float8 AS avg_resolution_hours
                    FROM "Ticket"
                    WHERE "deletedAt" IS NULL AND "assignedToId" IS NOT NULL ${propertyFrag}
                    GROUP BY "assignedToId"
                    ORDER BY (COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS'))) DESC
                `
            ]);

        // statusCounts
        const statusCounts = { open: 0, inProgress: 0, resolved: 0, dismissed: 0 };
        for (const g of statusGroups) {
            if (g.status === 'OPEN') statusCounts.open = g._count._all;
            else if (g.status === 'IN_PROGRESS') statusCounts.inProgress = g._count._all;
            else if (g.status === 'RESOLVED') statusCounts.resolved = g._count._all;
            else if (g.status === 'DISMISSED') statusCounts.dismissed = g._count._all;
        }

        const res = resolutionRows[0] ?? { resolved_count: 0, avg_hours: null, median_hours: null };

        // assignee names (fetched separately, merged in JS — Better Auth ids are strings)
        const assigneeIds = assigneeRows.map(r => r.assignee_id);
        const users = assigneeIds.length
            ? await db.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } })
            : [];
        const nameById = new Map(users.map(u => [u.id, u.name]));

        return {
            statusCounts,
            urgentOpenCount,
            resolvedInRange: res.resolved_count,
            avgResolutionHours: res.avg_hours,
            medianResolutionHours: res.median_hours,
            byPriority: priorityGroups.map(g => ({ priority: g.priority, count: g._count._all })),
            byCategory: categoryGroups
                .filter((g): g is typeof g & { category: NonNullable<typeof g.category> } => g.category !== null)
                .map(g => ({ category: g.category, count: g._count._all })),
            byAssignee: assigneeRows.map(r => ({
                assigneeId: r.assignee_id,
                assigneeName: nameById.get(r.assignee_id) ?? 'Unknown',
                openCount: r.open_count,
                inProgressCount: r.in_progress_count,
                resolvedCount: r.resolved_count,
                avgResolutionHours: r.avg_resolution_hours
            }))
        };
    }
};
