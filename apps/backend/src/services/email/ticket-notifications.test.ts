import { describe, it, expect } from 'vitest';
import { buildTicketNotifications, buildUserReplyNotifications } from './ticket-notifications.js';

const ticket = (assignedToId: string | null) => ({
    id: 't-1',
    summary: 'Leaking sink',
    assignedToId
});

const assignee = { email: 'manager@x.com', name: 'Mara' };
const propertyManager = { email: 'ivan@x.com', name: 'Ivan' };

describe('buildTicketNotifications', () => {
    const newTicket = (assignedToId: string | null, category: string | null = 'PLUMBING') => ({
        id: 't-1',
        propertyId: 'p-1',
        category,
        priority: 'HIGH',
        summary: 'Leaking sink',
        assignedToId
    });

    it('emails the assignee', () => {
        const r = buildTicketNotifications(newTicket('m-1'), 'Sea Flat', assignee);
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({
            kind: 'assigned',
            to: 'manager@x.com',
            assigneeName: 'Mara',
            propertyTitle: 'Sea Flat',
            category: 'PLUMBING',
            priority: 'HIGH',
            summary: 'Leaking sink',
            ticketId: 't-1'
        });
    });

    it('labels a missing category as Unclassified', () => {
        const r = buildTicketNotifications(newTicket('m-1', null), 'Sea Flat', assignee);
        expect(r[0].category).toBe('Unclassified');
    });

    it('sends nothing when the ticket is unassigned', () => {
        // Only reachable for a legacy property with no manager — there is no
        // triage queue and no admin fan-out to fall back to.
        expect(buildTicketNotifications(newTicket(null), 'Sea Flat', null)).toEqual([]);
    });

    it('sends nothing when the assignee could not be resolved', () => {
        expect(buildTicketNotifications(newTicket('m-deleted'), 'Sea Flat', null)).toEqual([]);
    });
});

describe('buildUserReplyNotifications', () => {
    it('emails the assignee when the ticket has a live assignee', () => {
        const r = buildUserReplyNotifications(ticket('m-1'), 'Sea Flat', assignee, propertyManager, 'It got worse');
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({
            kind: 'user_replied',
            to: 'manager@x.com',
            recipientName: 'Mara',
            propertyTitle: 'Sea Flat',
            summary: 'Leaking sink',
            messageBody: 'It got worse',
            ticketId: 't-1'
        });
    });

    it('falls back to the property manager when the ticket is unassigned', () => {
        const r = buildUserReplyNotifications(ticket(null), 'Sea Flat', null, propertyManager, 'Hello?');
        expect(r.map(n => n.to)).toEqual(['ivan@x.com']);
    });

    it('falls back to the property manager when the assignee is gone (soft-deleted)', () => {
        // assignedToId set but assignee unresolvable — the reply must not vanish
        const r = buildUserReplyNotifications(ticket('m-deleted'), 'Sea Flat', null, propertyManager, 'Anyone there?');
        expect(r.map(n => n.to)).toEqual(['ivan@x.com']);
    });

    it('returns nothing when there is no assignee and no property manager', () => {
        expect(buildUserReplyNotifications(ticket(null), 'Sea Flat', null, null, 'hi')).toEqual([]);
    });
});
