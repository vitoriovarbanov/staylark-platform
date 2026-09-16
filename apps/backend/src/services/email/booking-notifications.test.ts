import { describe, it, expect } from 'vitest';
import { buildNewBookingNotifications } from './booking-notifications.js';

const details = {
    propertyTitle: 'Sea Flat',
    checkIn: '2026-08-01',
    checkOut: '2026-08-05',
    totalPrice: 480
};

const manager = { id: 'm-1', email: 'manager@x.com', name: 'Mara' };

describe('buildNewBookingNotifications', () => {
    it('emails the property manager', () => {
        const r = buildNewBookingNotifications(details, manager, 'guest-1');
        expect(r.map(n => n.to)).toEqual(['manager@x.com']);
        expect(r[0]).toMatchObject({
            kind: 'new_booking',
            recipientName: 'Mara',
            propertyTitle: 'Sea Flat',
            checkIn: '2026-08-01',
            checkOut: '2026-08-05',
            totalPrice: 480
        });
    });

    it('sends nothing when the property has no manager', () => {
        expect(buildNewBookingNotifications(details, null, 'guest-1')).toEqual([]);
    });

    it('skips the actor when a manager books on their own property', () => {
        expect(buildNewBookingNotifications(details, manager, 'm-1')).toEqual([]);
    });

    it('never emails admins — they hold no operational role', () => {
        // Regression guard for the role-narrowing change: the builder has no admin
        // input at all, so a reintroduced fan-out would break this signature.
        const r = buildNewBookingNotifications(details, manager, 'guest-1');
        expect(r).toHaveLength(1);
        expect(r[0].to).toBe('manager@x.com');
    });
});
