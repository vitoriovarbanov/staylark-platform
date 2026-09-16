import type { DurationDiscountApplied } from '@staylark/contract';

export type BookingMode = 'nightly' | 'monthly';

/**
 * Label for an applied duration discount, framed to match the current booking view.
 *
 * Duration-discount rules are named in months ("1+ month stay"), which reads
 * naturally in the Monthly view but not in the nightly view — there the same
 * 28-night threshold is clearer as weeks. So Monthly keeps the rule's own name;
 * nightly derives a week label from the rule threshold (28 → "4+ weeks stay").
 */
export function durationDiscountLabel(discount: DurationDiscountApplied, mode: BookingMode): string {
    if (mode === 'monthly') return discount.ruleName;

    const weeks = Math.floor(discount.minNights / 7);
    return `${weeks}+ week${weeks === 1 ? '' : 's'} stay`;
}
