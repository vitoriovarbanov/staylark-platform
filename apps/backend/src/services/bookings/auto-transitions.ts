import {
    bookingsRepository,
    type AutoExpiredBookingRow
} from '../../routes/bookings/repository/bookings.repository.js';
import { pricingService } from '../../routes/pricing/service/pricing.service.js';
import { sendBookingAutoExpiredEmail } from '../email/email.service.js';
import { logger } from '../../utils/logger.js';

// Wrap each send so a Resend outage never affects the calling request.
function notifyAutoExpired(rows: AutoExpiredBookingRow[]): void {
    for (const row of rows) {
        try {
            sendBookingAutoExpiredEmail({
                to: row.userEmail,
                propertyTitle: row.propertyTitle,
                propertyId: row.propertyId,
                checkIn: row.checkIn,
                checkOut: row.checkOut
            });
        } catch (err) {
            logger.error({ err, bookingId: row.id, userId: row.userId }, 'auto-expire email dispatch failed');
        }
    }
}

// Call at the top of any service op that reads booking state so readers never
// see rows whose status is stale relative to the clock.
export async function runAutoTransitions(): Promise<void> {
    const expired = await bookingsRepository.autoTransitionStatuses();
    if (expired.length > 0) {
        logger.info({ count: expired.length }, 'auto-expired PENDING bookings');
        // Auto-expired bookings free occupancy → invalidate cached quotes on those properties.
        for (const propertyId of new Set(expired.map(r => r.propertyId))) {
            pricingService.invalidateCache(propertyId);
        }
        notifyAutoExpired(expired);
    }
}
