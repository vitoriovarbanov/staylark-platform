import { bookingsRepository } from '../repository/bookings.repository.js';
import { propertiesRepository } from '../../properties/repository/properties.repository.js';
import { pricingService } from '../../pricing/service/pricing.service.js';
import { priceQuoteRepository } from '../../pricing/repository/price-quote.repository.js';
import { PRICE_DRIFT_TOLERANCE, MAX_STAY_NIGHTS } from '../../pricing/service/pricing.config.js';
import { NotFoundError, ForbiddenError, ConflictError, AppError, PriceDriftError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { runAutoTransitions } from '../../../services/bookings/auto-transitions.js';
import { db } from '../../../config/database.js';
import { sendBookingConfirmedEmail, sendNewBookingEmail } from '../../../services/email/email.service.js';
import { buildNewBookingNotifications } from '../../../services/email/booking-notifications.js';
import type { CreateBooking, BookingQuery } from '@staylark/contract';

/** Valid status transitions: [from] → [to] */
const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['CANCELLED'], // ACTIVE handled by auto-transition
    ACTIVE: ['CANCELLED'], // COMPLETED handled by auto-transition
    COMPLETED: [],
    CANCELLED: []
};

/** Cancellation deadline: 48 hours in milliseconds */
const CANCELLATION_DEADLINE_MS = 48 * 60 * 60 * 1000;

function calculateNights(checkIn: string, checkOut: string): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay);
}

/**
 * Fire-and-forget "new booking" email to the property's manager. Admins hold no
 * operational role and are never notified. The pure builder skips the actor (a
 * manager booking on their own property). Never throws into the caller — a failed
 * notification must not fail booking creation.
 */
async function dispatchNewBookingNotifications(params: {
    propertyTitle: string;
    managerId: string | null;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    actorUserId: string;
}): Promise<void> {
    const manager = params.managerId
        ? await db.user.findFirst({
              where: { id: params.managerId, deletedAt: null },
              select: { id: true, email: true, name: true }
          })
        : null;

    const notifications = buildNewBookingNotifications(
        {
            propertyTitle: params.propertyTitle,
            checkIn: params.checkIn,
            checkOut: params.checkOut,
            totalPrice: params.totalPrice
        },
        manager,
        params.actorUserId
    );

    for (const n of notifications) {
        sendNewBookingEmail({
            to: n.to,
            recipientName: n.recipientName,
            propertyTitle: n.propertyTitle,
            checkIn: n.checkIn,
            checkOut: n.checkOut,
            totalPrice: n.totalPrice
        });
    }
}

export const bookingsService = {
    create: async (data: CreateBooking, userId: string) => {
        // Flush stale PENDINGs first so a forgotten booking doesn't falsely collide.
        await runAutoTransitions();

        const property = await propertiesRepository.findById(data.propertyId);
        if (!property) throw new NotFoundError('Property not found');

        const today = new Date().toISOString().split('T')[0];
        if (data.checkIn < today) {
            throw new AppError('Check-in date cannot be in the past', 400);
        }

        const nights = calculateNights(data.checkIn, data.checkOut);
        if (nights < 1 || nights > MAX_STAY_NIGHTS) {
            throw new AppError(`Stay duration must be between 1 and ${MAX_STAY_NIGHTS} nights`, 400);
        }

        if (data.guests > property.maxGuests) {
            throw new AppError(`Guest count (${data.guests}) exceeds property maximum (${property.maxGuests})`, 400);
        }

        // Server-side price validation — NOT a guest impression, so don't log a
        // PriceQuote row (the guest's browse request already logged one). Avoids
        // phantom "declined" rows when the booking is rejected below.
        const quote = await pricingService.quote(data.propertyId, data.checkIn, data.checkOut, {
            logImpression: false
        });

        // Reject stale checkout pricing (industry standard ±5%) so users can't lock in expired discounts.
        // Denominator is the larger of (server quote, client expected) so a tiny client value can't
        // synthesize huge relative drift and the server-side number always bounds the comparison.
        if (data.expectedTotalPrice !== undefined) {
            const denom = Math.max(quote.totalPrice, data.expectedTotalPrice);
            const drift = Math.abs(quote.totalPrice - data.expectedTotalPrice) / denom;
            if (drift > PRICE_DRIFT_TOLERANCE) {
                throw new PriceDriftError(quote.totalPrice, data.expectedTotalPrice);
            }
        }

        const breakdownSum = quote.breakdown.reduce((s, n) => s + n.price, 0);
        if (Math.abs(breakdownSum - quote.totalPrice) > 0.01) {
            throw new AppError(
                `Pricing engine produced inconsistent quote: sum(${breakdownSum.toFixed(2)}) ≠ total(${quote.totalPrice.toFixed(2)})`,
                500
            );
        }

        const booking = await bookingsRepository.createWithAvailabilityCheck({
            userId,
            propertyId: data.propertyId,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            guests: data.guests,
            totalPrice: quote.totalPrice,
            priceBreakdown: quote.breakdown
        });

        // A booking is a converted quote — flip the matching PriceQuote row (the
        // guest's browse impression) so training later sees it as an "accepted price".
        // Fire-and-forget: it only feeds future training and is non-fatal on miss, so
        // it must not add latency to the booking response.
        void priceQuoteRepository
            .markConverted({
                propertyId: data.propertyId,
                checkIn: data.checkIn,
                checkOut: data.checkOut,
                userId,
                bookingId: booking.id
            })
            .catch(err => logger.warn({ err, bookingId: booking.id }, 'priceQuote.markConverted.failed'));

        // New booking changes occupancy → any cached quote for this property is stale.
        pricingService.invalidateCache(data.propertyId);

        // Notify the property's manager and all admins. Fire-and-forget so a slow
        // or failed email never adds latency to (or fails) the booking response.
        void dispatchNewBookingNotifications({
            propertyTitle: property.title,
            managerId: property.managerId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            totalPrice: booking.totalPrice,
            actorUserId: userId
        }).catch(err => logger.warn({ err, bookingId: booking.id }, 'newBooking.notify.failed'));

        return booking;
    },

    getById: async (id: string, userId: string, userRole: string) => {
        await runAutoTransitions();

        const booking = await bookingsRepository.findById(id);
        if (!booking) throw new NotFoundError('Booking not found');

        // Access control. Admins have no operational access — they fall through to
        // the guest path and can only see bookings they made themselves.
        if (userRole === 'MANAGER') {
            const isOwn = booking.userId === userId;
            const isManaged = await bookingsRepository.isBookingOnManagedProperty(id, userId);
            if (!isOwn && !isManaged) throw new ForbiddenError('Access denied');
            return booking;
        }
        // USER
        if (booking.userId !== userId) throw new ForbiddenError('Access denied');
        return booking;
    },

    list: async (query: BookingQuery, userId: string, userRole: string) => {
        await runAutoTransitions();

        if (userRole === 'MANAGER') {
            const managedPropertyIds = await bookingsRepository.findManagedPropertyIds(userId);
            return bookingsRepository.findMany({
                ...query,
                userId,
                managedPropertyIds
            });
        }

        // USER and ADMIN: own bookings only. An admin who books a stay is a guest
        // for that booking and has no operational view beyond it.
        return bookingsRepository.findMany({ ...query, userId });
    },

    confirm: async (id: string, userId: string, userRole: string, notify: boolean = false) => {
        const booking = await bookingsRepository.findById(id);
        if (!booking) throw new NotFoundError('Booking not found');

        // Only the property's manager can confirm.
        if (userRole !== 'MANAGER') {
            throw new ForbiddenError('Only property managers can confirm bookings');
        }
        if (!(await bookingsRepository.isBookingOnManagedProperty(id, userId))) {
            throw new ForbiddenError('Access denied');
        }

        if (booking.status !== 'PENDING') {
            throw new ConflictError(`Cannot confirm a booking with status '${booking.status}'`);
        }

        const updated = await bookingsRepository.updateStatusIf(id, 'PENDING', 'CONFIRMED');

        if (notify && booking.user?.email) {
            sendBookingConfirmedEmail({
                to: booking.user.email,
                propertyTitle: booking.property.title,
                propertyId: booking.propertyId,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut
            });
        }

        return updated;
    },

    cancel: async (id: string, userId: string, userRole: string) => {
        const booking = await bookingsRepository.findById(id);
        if (!booking) throw new NotFoundError('Booking not found');

        // Validate status allows cancellation
        if (!VALID_TRANSITIONS[booking.status]?.includes('CANCELLED')) {
            throw new ConflictError(`Cannot cancel a booking with status '${booking.status}'`);
        }

        // MANAGER can cancel bookings on their properties
        if (userRole === 'MANAGER') {
            const isManaged = await bookingsRepository.isBookingOnManagedProperty(id, userId);
            if (isManaged) {
                const updated = await bookingsRepository.updateStatusIf(
                    id,
                    booking.status,
                    'CANCELLED',
                    'MANUAL_ADMIN'
                );
                pricingService.invalidateCache(booking.propertyId);
                return updated;
            }
            // Fall through to guest logic if not managing the property
        }

        // Guest (USER, ADMIN, or MANAGER acting as guest): can only cancel own bookings
        if (booking.userId !== userId) {
            throw new ForbiddenError('Access denied');
        }

        // Guest cancellation of CONFIRMED bookings: 48h deadline
        if (booking.status === 'CONFIRMED') {
            const checkInDate = new Date(booking.checkIn + 'T00:00:00Z');
            const now = new Date();
            if (checkInDate.getTime() - now.getTime() < CANCELLATION_DEADLINE_MS) {
                throw new ForbiddenError('Cannot cancel a confirmed booking less than 48 hours before check-in');
            }
        }

        // ACTIVE bookings: only the property's manager can cancel (handled above).
        if (booking.status === 'ACTIVE') {
            throw new ForbiddenError('Only the property manager can cancel an active booking');
        }

        const updated = await bookingsRepository.updateStatusIf(id, booking.status, 'CANCELLED', 'MANUAL_GUEST');
        pricingService.invalidateCache(booking.propertyId);
        return updated;
    },

    countPendingNearExpiry: async (userId: string, userRole: string): Promise<number> => {
        // Staff-only signal for the manager nav badge; admins are refused outright
        // rather than falling through, since there is no guest equivalent.
        if (userRole !== 'MANAGER') {
            throw new ForbiddenError('Access denied');
        }
        const managedPropertyIds = await bookingsRepository.findManagedPropertyIds(userId);
        if (managedPropertyIds.length === 0) return 0;
        return bookingsRepository.countPendingNearExpiry(managedPropertyIds);
    }
};
