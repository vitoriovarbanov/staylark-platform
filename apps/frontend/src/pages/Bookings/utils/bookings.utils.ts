import dayjs from 'dayjs';
import { type Transition } from 'motion/react';
import { useEffect, useState } from 'react';
import type { BookingWithRelations } from '@/hooks/api/use-bookings';

export const formatCountdown = (target: dayjs.Dayjs): string => {
    const diffMs = target.diff(dayjs());

    if (diffMs <= 0) return '0';

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);

    if (days > 0) return `${days}D ${hours}H`;
    const minutes = totalMinutes - hours * 60;
    return `${hours}H ${minutes}M`;
};

export function staggered(delay: number, reduced: boolean): Transition {
    return reduced ? { duration: 0 } : { duration: 0.45, delay, ease: 'easeOut' };
}

export const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Stay progress for an ACTIVE booking, framed in nights (hotel-standard) with a
 * checkout countdown. Bookings are date-only (YYYY-MM-DD), so this is whole-day
 * math against the local day — no time-of-day drift.
 *
 * A 4-night stay (26→30 Jun) spans 5 calendar days: the guest sleeps nights 1–4
 * and leaves on the checkout morning (30th). The previous version counted a
 * 1-based day index against the night total, so the last night (29th) showed
 * "day 4 of 4 · 100%" even though checkout was the next day. Here `percent` is
 * driven by *completed nights*, so it only reaches 100% on the checkout day, and
 * the label counts the night in progress plus a "Checkout …" countdown.
 */
export function computeStayCountdown(checkIn: string, checkOut: string) {
    const start = dayjs(checkIn).startOf('day');
    const end = dayjs(checkOut).startOf('day');
    const today = dayjs().startOf('day');

    const nights = Math.max(end.diff(start, 'day'), 1);
    // Whole nights already slept, clamped into the stay.
    const nightsElapsed = Math.min(Math.max(today.diff(start, 'day'), 0), nights);
    // The night currently in progress (1-based); on checkout day there is none.
    const currentNight = Math.min(nightsElapsed + 1, nights);
    // Date-only days to checkout == nights still to sleep. 0 = checkout day.
    const nightsUntilCheckout = Math.max(end.diff(today, 'day'), 0);
    const isCheckoutDay = nightsUntilCheckout === 0;

    const checkoutLabel = isCheckoutDay
        ? 'Checkout today'
        : nightsUntilCheckout === 1
          ? 'Checkout tomorrow'
          : `Checkout in ${nightsUntilCheckout} nights`;

    return {
        nights,
        currentNight,
        nightsUntilCheckout,
        isCheckoutDay,
        checkoutLabel,
        percent: Math.round((nightsElapsed / nights) * 100)
    };
}

export function useLiveCountdown(target: string): string {
    const [text, setText] = useState(() => formatCountdown(dayjs(target)));

    useEffect(() => {
        const id = window.setInterval(() => setText(formatCountdown(dayjs(target))), 60000);
        return () => window.clearInterval(id);
    }, [target]);

    return text;
}

/** Pick the single most relevant booking to feature in the hero. */
export function pickHero(bookings: BookingWithRelations[]): BookingWithRelations | null {
    // Currently staying → the active stay ending soonest is the most imminent.
    const active = bookings.filter(b => b.status === 'ACTIVE').sort((a, b) => a.checkOut.localeCompare(b.checkOut))[0];
    if (active) return active;

    const todayIso = dayjs().format('YYYY-MM-DD');
    const confirmed = bookings
        .filter(b => b.status === 'CONFIRMED' && b.checkIn >= todayIso)
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
    if (confirmed) return confirmed;

    // Soonest check-in first, mirroring the CONFIRMED branch.
    const pending = bookings.filter(b => b.status === 'PENDING').sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
    if (pending) return pending;

    const completed = bookings
        .filter(b => b.status === 'COMPLETED')
        .sort((a, b) => b.checkOut.localeCompare(a.checkOut))[0];
    return completed ?? null;
}

export interface PartitionedBookings {
    active: BookingWithRelations[];
    upcoming: BookingWithRelations[];
    past: BookingWithRelations[];
    cancelled: BookingWithRelations[];
}

/**
 * Split bookings into stacked-section buckets, excluding the hero booking so it
 * is never shown twice.
 * - Active = current stays (Active) other than the one featured as hero, ending
 *   soonest first. Kept separate from Upcoming so a second concurrent stay is
 *   labelled as a current stay rather than mislabelled as upcoming.
 * - Upcoming = future stays (Confirmed + Pending), soonest check-in first.
 * - Past = Completed, most recent check-out first.
 * - Cancelled = Cancelled, most recent check-in first (checkIn is stable, unlike
 *   updatedAt which any later write would bump).
 */
export function partitionBookings(
    bookings: BookingWithRelations[],
    hero: BookingWithRelations | null
): PartitionedBookings {
    const notHero = (b: BookingWithRelations) => b.id !== hero?.id;

    const active = bookings
        .filter(b => b.status === 'ACTIVE' && notHero(b))
        .sort((a, b) => a.checkOut.localeCompare(b.checkOut));

    const upcoming = bookings
        .filter(b => (b.status === 'CONFIRMED' || b.status === 'PENDING') && notHero(b))
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    const past = bookings
        .filter(b => b.status === 'COMPLETED' && notHero(b))
        .sort((a, b) => b.checkOut.localeCompare(a.checkOut));

    const cancelled = bookings
        .filter(b => b.status === 'CANCELLED' && notHero(b))
        .sort((a, b) => b.checkIn.localeCompare(a.checkIn));

    return { active, upcoming, past, cancelled };
}
