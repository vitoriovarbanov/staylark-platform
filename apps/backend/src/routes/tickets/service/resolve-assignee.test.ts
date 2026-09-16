import { describe, it, expect } from 'vitest';
import { chooseTicketAssignee, type HandlerCandidate } from './resolve-assignee.js';

/** Handler shorthand: id, whether they manage a property in the ticket's city, open load. */
const h = (id: string, managesInCity = false, openTickets = 0): HandlerCandidate => ({
    id,
    managesInCity,
    openTickets
});

describe('chooseTicketAssignee', () => {
    it('prefers the property manager when they handle the category', () => {
        // Locality beats specialism for someone who is both — even when a handler
        // elsewhere is completely idle.
        expect(chooseTicketAssignee('PLUMBING', 'mgr-1', [h('mgr-2', true, 0), h('mgr-1', false, 99)])).toBe('mgr-1');
    });

    it('routes to a designated handler when the property manager is not one', () => {
        expect(chooseTicketAssignee('PLUMBING', 'mgr-1', [h('mgr-2')])).toBe('mgr-2');
    });

    it('prefers a handler who manages in the same city', () => {
        expect(chooseTicketAssignee('PLUMBING', 'mgr-1', [h('mgr-2', false, 0), h('mgr-3', true, 5)])).toBe('mgr-3');
    });

    it('breaks a same-city tie by fewest open tickets', () => {
        expect(
            chooseTicketAssignee('PLUMBING', 'mgr-1', [h('mgr-2', true, 7), h('mgr-3', true, 2), h('mgr-4', true, 4)])
        ).toBe('mgr-3');
    });

    it('breaks an out-of-city tie by fewest open tickets', () => {
        expect(chooseTicketAssignee('PLUMBING', 'mgr-1', [h('mgr-2', false, 7), h('mgr-3', false, 2)])).toBe('mgr-3');
    });

    it('falls back to id order only when city and load are identical', () => {
        // A last-resort tie-break purely so the choice is reproducible.
        expect(chooseTicketAssignee('PLUMBING', 'mgr-1', [h('mgr-9', true, 3), h('mgr-2', true, 3)])).toBe('mgr-2');
        expect(chooseTicketAssignee('PLUMBING', 'mgr-1', [h('mgr-2', true, 3), h('mgr-9', true, 3)])).toBe('mgr-2');
    });

    it('does not mutate the caller’s handler list', () => {
        const handlers = [h('mgr-9', true, 1), h('mgr-2', true, 0)];
        chooseTicketAssignee('PLUMBING', null, handlers);
        expect(handlers.map(x => x.id)).toEqual(['mgr-9', 'mgr-2']);
    });

    it('falls back to the property manager when the category has no handlers', () => {
        expect(chooseTicketAssignee('PLUMBING', 'mgr-1', [])).toBe('mgr-1');
    });

    it('falls back to the property manager when the ticket has no category', () => {
        expect(chooseTicketAssignee(null, 'mgr-1', [h('mgr-2', true, 0)])).toBe('mgr-1');
    });

    it('still routes to a handler when the property has no manager', () => {
        expect(chooseTicketAssignee('PLUMBING', null, [h('mgr-2')])).toBe('mgr-2');
    });

    it('returns null only when no manager and no handler applies', () => {
        expect(chooseTicketAssignee(null, null, [])).toBeNull();
        expect(chooseTicketAssignee('PLUMBING', null, [])).toBeNull();
        // No category means routing is never consulted, so handlers cannot rescue it.
        expect(chooseTicketAssignee(null, null, [h('mgr-2', true, 0)])).toBeNull();
    });
});
