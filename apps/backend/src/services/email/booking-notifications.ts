type Recipient = { id: string; email: string; name: string };

export type NewBookingNotification = {
    kind: 'new_booking';
    to: string;
    recipientName: string;
    propertyTitle: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
};

/**
 * Pure decision function: who gets the "new booking" email and with what content.
 * No I/O — the testable seam.
 *
 * The recipient is the property's manager, and only them: admins hold a pure
 * user-administration role and receive no operational notifications. The actor is
 * never emailed about their own action, so a manager booking on their own
 * property gets nothing.
 */
export function buildNewBookingNotifications(
    details: { propertyTitle: string; checkIn: string; checkOut: string; totalPrice: number },
    manager: Recipient | null,
    actorUserId: string
): NewBookingNotification[] {
    if (!manager || manager.id === actorUserId) return [];

    return [
        {
            kind: 'new_booking',
            to: manager.email,
            recipientName: manager.name,
            propertyTitle: details.propertyTitle,
            checkIn: details.checkIn,
            checkOut: details.checkOut,
            totalPrice: details.totalPrice
        }
    ];
}
