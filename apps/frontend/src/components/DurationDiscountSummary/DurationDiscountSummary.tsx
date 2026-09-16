import { Divider, Group, Stack, Text } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import type { DurationDiscountApplied } from '@staylark/contract';
import { durationDiscountLabel, type BookingMode } from '@/lib/duration-label';
import classes from './DurationDiscountSummary.module.css';

interface DurationDiscountSummaryProps {
    /** The applied duration discount returned by the pricing endpoint. */
    discount: DurationDiscountApplied;
    /** The final, post-discount total — already in the response, passed in to avoid drift. */
    discountedTotal: number;
    /** Booking view — frames the label (month-named in monthly, week-based in nightly). */
    mode: BookingMode;
}

/**
 * Renders the full discount affordance for a stay where a DURATION_DISCOUNT
 * rule fired: a savings band with the rule name + `−X%` pill, a divider,
 * the strikethrough original total, and the discounted total with a
 * "You save €X" sublabel.
 *
 * Used on:
 *   - the property page booking sidebar (BookingSidebar)
 *   - the booking confirmation modal (BookingConfirmationModal)
 *
 * The caller's existing layout supplies any preceding divider; this
 * component owns its own internal divider between band and totals.
 */
export function DurationDiscountSummary({ discount, discountedTotal, mode }: DurationDiscountSummaryProps) {
    // Clamp at 0 so per-night rounding residue can never render a "−€0.00" or
    // negative saving. The backend guarantees originalTotal >= discountedTotal for
    // a real discount; this only absorbs sub-cent float drift.
    const savedAmount = Math.max(0, discount.originalTotal - discountedTotal);

    return (
        <>
            <div className={classes.savingsBand}>
                <span className={classes.savingsBandStripe} aria-hidden />
                <Group justify='space-between' align='center' wrap='nowrap' gap='xs'>
                    <Group gap={8} wrap='nowrap'>
                        <IconSparkles size={16} className={classes.savingsIcon} />
                        <Stack gap={0}>
                            <Text size='sm' fw={600} className={classes.savingsTitle}>
                                {durationDiscountLabel(discount, mode)} applied
                            </Text>
                            <Text size='xs' className={classes.savingsSubtitle}>
                                Long-stay rate &mdash; on every night
                            </Text>
                        </Stack>
                    </Group>
                    <span className={classes.savingsPill}>&minus;{discount.percent}%</span>
                </Group>
            </div>

            <Divider color='gray.2' />

            <Stack gap={4}>
                <Group justify='space-between'>
                    <Text size='sm' c='dimmed'>
                        Original total
                    </Text>
                    <Text size='sm' c='dimmed' className={classes.strikethroughTotal}>
                        &euro;{discount.originalTotal.toFixed(2)}
                    </Text>
                </Group>
                <Group justify='space-between' align='flex-start'>
                    <Stack gap={0}>
                        <Text fw={700} size='md'>
                            Total
                        </Text>
                        <Text size='xs' className={classes.savingsAmount}>
                            You save &euro;{savedAmount.toFixed(2)}
                        </Text>
                    </Stack>
                    <Text className={classes.totalAmountDiscounted}>&euro;{discountedTotal.toFixed(2)}</Text>
                </Group>
            </Stack>
        </>
    );
}
