import dayjs from 'dayjs';
import type { PriceBreakdownNight } from '@staylark/contract';

export interface BillingPeriod {
    /** Human label, e.g. "Mar 15 – Apr 14". */
    label: string;
    /** First night of the period, inclusive (YYYY-MM-DD). */
    periodStart: string;
    /** Last night of the period, inclusive (YYYY-MM-DD). */
    periodEnd: string;
    /** Number of nights in this period. */
    nights: number;
    /** Sum of the per-night prices in this period. */
    subtotal: number;
    /** Average per-night price within this period. */
    avgPerNight: number;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Folds a per-night price breakdown into anchored monthly billing periods.
 *
 * Periods are anchored to the check-in day-of-month: [checkIn, checkIn+1mo),
 * [checkIn+1mo, checkIn+2mo), … dayjs `.add(n, 'month')` clamps month-ends
 * (Jan 31 + 1mo → Feb 28). The final period is bounded by checkOut (exclusive),
 * so a clean N-month stay yields exactly N periods.
 *
 * The sum of all period subtotals equals the sum of the per-night prices.
 */
export function groupNightsIntoBillingPeriods(
    checkIn: string,
    checkOut: string,
    breakdown: PriceBreakdownNight[]
): BillingPeriod[] {
    const end = dayjs(checkOut);
    const periods: BillingPeriod[] = [];
    let cursor = dayjs(checkIn);
    let monthIndex = 1;

    while (cursor.isBefore(end)) {
        let next = dayjs(checkIn).add(monthIndex, 'month');
        if (next.isAfter(end)) next = end; // clamp final period to checkout

        const nightsInPeriod = breakdown.filter(n => {
            const d = dayjs(n.date);
            return !d.isBefore(cursor) && d.isBefore(next);
        });
        const count = nightsInPeriod.length;
        const subtotal = round2(nightsInPeriod.reduce((sum, n) => sum + n.price, 0));
        const lastNight = next.subtract(1, 'day');

        // Always show the year on the end date; add it to the start date too when
        // the period straddles a year boundary (e.g. "Dec 15, 2026 – Jan 14, 2027")
        // so a multi-month stay is never year-ambiguous.
        const label =
            cursor.year() === lastNight.year()
                ? `${cursor.format('MMM D')} – ${lastNight.format('MMM D, YYYY')}`
                : `${cursor.format('MMM D, YYYY')} – ${lastNight.format('MMM D, YYYY')}`;

        periods.push({
            label,
            periodStart: cursor.format('YYYY-MM-DD'),
            periodEnd: lastNight.format('YYYY-MM-DD'),
            nights: count,
            subtotal,
            avgPerNight: count > 0 ? round2(subtotal / count) : 0
        });

        cursor = next;
        monthIndex += 1;
    }

    return periods;
}
