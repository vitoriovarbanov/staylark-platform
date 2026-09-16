type Recipient = { email: string; name: string };

type TicketForNotify = {
    id: string;
    propertyId: string;
    category: string | null;
    priority: string;
    summary: string | null;
    assignedToId: string | null;
};

export type TicketNotification = {
    kind: 'assigned';
    to: string;
    assigneeName: string;
    propertyTitle: string;
    category: string;
    priority: string;
    summary: string | null;
    ticketId: string;
};

/**
 * Pure decision function: given a persisted ticket and its resolved assignee,
 * returns the emails that should be sent. No I/O — the testable seam.
 *
 * Every ticket has an assignee, because the property's manager is the guaranteed
 * fallback when category routing doesn't apply — so there is no triage queue and
 * no admin fan-out. Returns nothing when the ticket is unassigned (only possible
 * for a legacy property with no manager) or when the assignee row is unresolvable.
 */
export function buildTicketNotifications(
    ticket: TicketForNotify,
    propertyTitle: string,
    assignee: Recipient | null
): TicketNotification[] {
    if (!ticket.assignedToId || !assignee) return [];

    return [
        {
            kind: 'assigned',
            to: assignee.email,
            assigneeName: assignee.name,
            propertyTitle,
            category: ticket.category ?? 'Unclassified',
            priority: ticket.priority,
            summary: ticket.summary,
            ticketId: ticket.id
        }
    ];
}

export type UserReplyNotification = {
    kind: 'user_replied';
    to: string;
    recipientName: string;
    propertyTitle: string;
    summary: string | null;
    messageBody: string;
    ticketId: string;
};

/**
 * Pure decision function for "the reporter replied on a ticket".
 *
 * Assignee resolved → one email to them. Otherwise (unassigned, or the assignee
 * was soft-deleted) → the property's manager, who always retains visibility of
 * tickets on their property. Nothing at all only when the property has no
 * manager, which is possible for legacy unassigned properties.
 */
export function buildUserReplyNotifications(
    ticket: { id: string; summary: string | null; assignedToId: string | null },
    propertyTitle: string,
    assignee: Recipient | null,
    propertyManager: Recipient | null,
    messageBody: string
): UserReplyNotification[] {
    const recipient = (ticket.assignedToId && assignee) || propertyManager;
    if (!recipient) return [];

    return [
        {
            kind: 'user_replied',
            to: recipient.email,
            recipientName: recipient.name,
            propertyTitle,
            summary: ticket.summary,
            messageBody,
            ticketId: ticket.id
        }
    ];
}
