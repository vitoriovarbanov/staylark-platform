import { db } from '../../../config/database.js';
import { Prisma, type TicketCategory, type TicketPriority, type TicketStatus, type UserRole } from '@prisma/client';
import type { TicketQuery, TicketSortField } from '@staylark/contract';
import { TICKET_STATUSES_TERMINAL } from '@staylark/contract';
import { buildOrderBy } from '../../../utils/list-order.js';

type TicketRow = {
    id: string;
    userId: string;
    propertyId: string;
    bookingId: string;
    assignedToId: string | null;
    transcription: string | null;
    category: TicketCategory | null;
    categoryRaw: string | null;
    priority: TicketPriority;
    status: TicketStatus;
    summary: string | null;
    needsReview: boolean;
    needsAssignment: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    reporterLastSeenAt: Date | null;
    _count: {
        messages: number;
    };
    // Latest message only (take: 1, newest first) — used to derive
    // awaitingStaffReply without loading the whole thread.
    messages: { authorId: string }[];
    property: { title: string; city: string };
    assignedTo: { name: string } | null;
};

// Every query that feeds serialize() pulls the property title/city and the assignee
// name so the API response is self-contained: the properties list endpoint is
// manager-scoped, and the managers list excludes soft-deleted users — so the FE can't
// always resolve these from a separate query.
const withRelations = {
    property: { select: { title: true, city: true } },
    assignedTo: { select: { name: true } },
    _count: { select: { messages: true } },
    // Just the newest message's author — enough to tell whether the guest is
    // waiting on staff. Prisma batches this, so it stays one round-trip per page.
    messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { authorId: true } }
} as const;

function serialize(t: TicketRow, unreadMessageCount = 0) {
    return {
        id: t.id,
        userId: t.userId,
        propertyId: t.propertyId,
        propertyTitle: t.property.title,
        propertyCity: t.property.city,
        bookingId: t.bookingId,
        assignedToName: t.assignedTo?.name ?? null,
        assignedToId: t.assignedToId,
        transcription: t.transcription,
        category: t.category,
        categoryRaw: t.categoryRaw,
        priority: t.priority,
        status: t.status,
        summary: t.summary,
        needsReview: t.needsReview,
        needsAssignment: t.needsAssignment,
        messageCount: t._count.messages,
        unreadMessageCount,
        // Latest message exists and was written by the reporter → staff owes a
        // reply. Clears as soon as any staff member posts (newest author flips).
        awaitingStaffReply: t.messages.length > 0 && t.messages[0]!.authorId === t.userId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString()
    };
}

function serializeMessage(m: {
    id: string;
    ticketId: string;
    authorId: string;
    body: string;
    createdAt: Date;
    author: { name: string; role: UserRole };
}) {
    return {
        id: m.id,
        ticketId: m.ticketId,
        authorId: m.authorId,
        authorName: m.author.name,
        authorRole: m.author.role,
        body: m.body,
        createdAt: m.createdAt.toISOString()
    };
}

const TICKET_SORT: Record<
    TicketSortField,
    (dir: 'asc' | 'desc') => Prisma.TicketOrderByWithRelationInput | Prisma.TicketOrderByWithRelationInput[]
> = {
    priority: dir => ({ priority: dir }),
    status: dir => ({ status: dir }),
    createdAt: dir => ({ createdAt: dir }),
    // asc = assigned on top (unassigned last); desc = unassigned on top.
    // Tickets are grouped by assignee presence; createdAt keeps each group newest-first.
    assignee: dir => [{ assignedToId: { sort: dir, nulls: dir === 'asc' ? 'last' : 'first' } }, { createdAt: 'desc' }]
};

// Preserves today's behavior when no sort is requested.
const TICKET_SORT_FALLBACK: Prisma.TicketOrderByWithRelationInput[] = [{ priority: 'desc' }, { createdAt: 'desc' }];

/**
 * Unread counts for the given reporter across their tickets, in ONE query:
 * messages not authored by the reporter, newer than each ticket's
 * reporterLastSeenAt (null = everything unread). Prisma can't compare two
 * columns of the same row, so the per-ticket cutoff goes into OR branches.
 */
async function unreadCountsFor(
    viewerId: string,
    tickets: { id: string; userId: string; reporterLastSeenAt: Date | null }[]
): Promise<Map<string, number>> {
    const own = tickets.filter(t => t.userId === viewerId);
    if (own.length === 0) return new Map();

    const grouped = await db.ticketMessage.groupBy({
        by: ['ticketId'],
        where: {
            authorId: { not: viewerId },
            OR: own.map(t => ({
                ticketId: t.id,
                ...(t.reporterLastSeenAt && { createdAt: { gt: t.reporterLastSeenAt } })
            }))
        },
        _count: { _all: true }
    });
    return new Map(grouped.map(g => [g.ticketId, g._count._all]));
}

export const ticketsRepository = {
    create: async (data: {
        userId: string;
        propertyId: string;
        bookingId: string;
        transcription: string;
        category: TicketCategory | null;
        categoryRaw: string | null;
        priority: TicketPriority;
        assignedToId: string | null;
        summary: string | null;
        needsReview: boolean;
        needsAssignment: boolean;
    }) => {
        const ticket = await db.ticket.create({ data, include: withRelations });
        return serialize(ticket);
    },

    findById: async (id: string, viewerId?: string) => {
        const t = await db.ticket.findFirst({ where: { id, deletedAt: null }, include: withRelations });
        if (!t) return null;
        const unread = viewerId ? ((await unreadCountsFor(viewerId, [t])).get(t.id) ?? 0) : 0;
        return serialize(t, unread);
    },

    list: async (scopedWhere: Prisma.TicketWhereInput, query: TicketQuery, viewerId?: string) => {
        const where: Prisma.TicketWhereInput = {
            ...scopedWhere,
            deletedAt: null,
            ...(query.status && { status: query.status }),
            ...(query.priority && { priority: query.priority }),
            ...(query.category && { category: query.category }),
            ...(query.propertyId && { propertyId: query.propertyId }),
            ...(query.assignedToId && { assignedToId: query.assignedToId }),
            ...(query.needsAssignment !== undefined && { needsAssignment: query.needsAssignment })
        };
        const skip = (query.page - 1) * query.limit;

        const [tickets, total] = await Promise.all([
            db.ticket.findMany({
                where,
                skip,
                take: query.limit,
                orderBy: buildOrderBy(query.sortBy, query.sortOrder, TICKET_SORT, TICKET_SORT_FALLBACK),
                include: withRelations
            }),
            db.ticket.count({ where })
        ]);

        const unread = viewerId ? await unreadCountsFor(viewerId, tickets) : new Map<string, number>();

        return {
            tickets: tickets.map(t => serialize(t, unread.get(t.id) ?? 0)),
            total,
            page: query.page,
            limit: query.limit,
            totalPages: Math.ceil(total / query.limit) || 1
        };
    },

    // resolvedAt: pass a Date to set, null to clear, or omit (undefined) to leave unchanged.
    updateStatus: async (id: string, status: TicketStatus, resolvedAt?: Date | null) => {
        // A terminal ticket (RESOLVED/DISMISSED) is closed — it must drop out of the
        // triage queue, otherwise an unassigned ticket dismissed straight from OPEN
        // keeps needsAssignment=true and pollutes the needs-assignment filter/count.
        const isTerminal = (TICKET_STATUSES_TERMINAL as readonly TicketStatus[]).includes(status);
        const ticket = await db.ticket.update({
            where: { id },
            data: {
                status,
                ...(isTerminal && { needsAssignment: false }),
                ...(resolvedAt !== undefined && { resolvedAt })
            },
            include: withRelations
        });
        return serialize(ticket);
    },

    /**
     * Reopen to IN_PROGRESS after the assignee was soft-deleted. The ticket is
     * unassigned rather than queued for admin triage — the property's manager
     * always retains visibility and can pick it up or reassign it.
     */
    reopenToTriage: async (id: string) => {
        const ticket = await db.ticket.update({
            where: { id },
            // Only ever called when leaving RESOLVED/DISMISSED → IN_PROGRESS, so clearing
            // resolvedAt is always correct here.
            data: { status: 'IN_PROGRESS', assignedToId: null, needsAssignment: false, resolvedAt: null },
            include: withRelations
        });
        return serialize(ticket);
    },

    reassign: async (id: string, assignedToId: string | null) => {
        const ticket = await db.ticket.update({
            where: { id },
            // needsAssignment stays false: the triage queue is retired. Unassigning
            // leaves the ticket with the property's manager, who always retains
            // visibility — there is no admin queue to fall back to.
            data: { assignedToId, needsAssignment: false },
            include: withRelations
        });
        return serialize(ticket);
    },

    // ── Thread messages ──────────────────────────────────────────

    listMessages: async (ticketId: string) => {
        const messages = await db.ticketMessage.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { name: true, role: true } } }
        });
        return messages.map(serializeMessage);
    },

    createMessage: async (ticketId: string, authorId: string, body: string) => {
        const message = await db.ticketMessage.create({
            data: { ticketId, authorId, body },
            include: { author: { select: { name: true, role: true } } }
        });
        return serializeMessage(message);
    },

    markSeen: async (ticketId: string) => {
        await db.ticket.update({ where: { id: ticketId }, data: { reporterLastSeenAt: new Date() } });
    },

    /** Total unread staff replies across all of a reporter's own (non-deleted) tickets. */
    unreadCountForReporter: async (userId: string): Promise<number> => {
        const tickets = await db.ticket.findMany({
            where: { userId, deletedAt: null },
            select: { id: true, userId: true, reporterLastSeenAt: true }
        });
        const counts = await unreadCountsFor(userId, tickets);
        let total = 0;
        for (const n of counts.values()) total += n;
        return total;
    }
};
