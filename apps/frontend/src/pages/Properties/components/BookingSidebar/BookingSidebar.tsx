import {
    Accordion,
    Box,
    Button,
    Divider,
    NumberInput,
    SegmentedControl,
    Select,
    Skeleton,
    Stack,
    Text
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';
import { DurationDiscountSummary } from '@/components/DurationDiscountSummary/DurationDiscountSummary';
import type { PriceBreakdownNight } from '@staylark/contract';
import dayjs from 'dayjs';
import type { PricingResponse } from '@staylark/contract';
import { groupNightsIntoBillingPeriods } from '@/lib/billing-periods';
import { durationDiscountLabel } from '@/lib/duration-label';
import { MonthlyBreakdownList } from './MonthlyBreakdownList';
import classes from './BookingSidebar.module.css';

/**
 * Nightly stays remain capped at 90 nights (the pre-monthly limit); only the
 * Monthly flow uses the longer 366-night ceiling. Enforced here on the check-out
 * picker so a nightly stay can never select beyond 90 nights.
 */
const NIGHTLY_MAX_NIGHTS = 90;

interface BookingSidebarProps {
    nightlyPrice: number;
    checkIn: Date | null;
    checkOut: Date | null;
    nights: number;
    guests: number;
    maxGuests: number;
    onCheckInChange: (date: Date | null) => void;
    onCheckOutChange: (date: Date | null) => void;
    mode: 'nightly' | 'monthly';
    months: number;
    onModeChange: (mode: string) => void;
    onMonthsChange: (months: number) => void;
    onGuestsChange: (value: number) => void;
    onBookNow: () => void;
    excludeDate?: (date: Date) => boolean;
    hasOverlap?: boolean;
    quote: PricingResponse | undefined;
    isQuoteLoading: boolean;
    isQuoteError: boolean;
}

export function BookingSidebar({
    nightlyPrice,
    checkIn,
    checkOut,
    nights,
    guests,
    maxGuests,
    onCheckInChange,
    onCheckOutChange,
    mode,
    months,
    onModeChange,
    onMonthsChange,
    onGuestsChange,
    onBookNow,
    excludeDate,
    hasOverlap = false,
    quote,
    isQuoteLoading,
    isQuoteError
}: BookingSidebarProps) {
    const canBook = nights > 0 && guests > 0 && !hasOverlap;
    const hasDates = !!checkIn && !!checkOut && nights > 0;

    // Fallback math when dynamic pricing fails — server still re-quotes at booking time.
    const fallbackTotal = nightlyPrice * nights;
    const showQuote = hasDates && quote !== undefined && !isQuoteError;
    const showFallback = hasDates && !showQuote && !isQuoteLoading;
    const total = showQuote ? quote.totalPrice : fallbackTotal;
    const avgPerNight = showQuote ? quote.dynamicPrice : nightlyPrice;

    const monthlyPeriods =
        mode === 'monthly' && showQuote && checkIn && checkOut
            ? groupNightsIntoBillingPeriods(
                  dayjs(checkIn).format('YYYY-MM-DD'),
                  dayjs(checkOut).format('YYYY-MM-DD'),
                  quote.breakdown
              )
            : [];

    return (
        <Box pos='relative' className={classes.bookingCard}>
            {/* Amber corner accents */}
            <span className={classes.bookingCorner} data-position='top-left' />
            <span className={classes.bookingCorner} data-position='top-right' />
            <span className={classes.bookingCorner} data-position='bottom-left' />
            <span className={classes.bookingCorner} data-position='bottom-right' />

            <Stack gap='md'>
                {/* Price header — date-gated */}
                <div>
                    {!hasDates && (
                        <Text size='sm' c='dimmed' className={classes.bookingPriceEmpty}>
                            Select dates to see your rate
                        </Text>
                    )}
                    {hasDates && isQuoteLoading && <Skeleton height={36} width='60%' radius='sm' />}
                    {hasDates && !isQuoteLoading && (
                        <>
                            <Text component='span' className={classes.bookingPrice}>
                                &euro;{avgPerNight.toFixed(2)}
                            </Text>
                            <Text component='span' className={classes.bookingPriceUnit}>
                                {' '}
                                {showQuote ? 'avg / night' : '/ night'}
                            </Text>
                        </>
                    )}
                </div>

                <Divider color='gray.2' />

                <SegmentedControl
                    fullWidth
                    value={mode}
                    onChange={onModeChange}
                    data={[
                        { label: 'Nightly', value: 'nightly' },
                        { label: 'Monthly', value: 'monthly' }
                    ]}
                />

                {/* Date pickers */}
                <DatePickerInput
                    label='Check-in'
                    placeholder='Select date'
                    leftSection={<IconCalendar size={16} />}
                    value={checkIn}
                    onChange={onCheckInChange}
                    minDate={new Date()}
                    maxDate={checkOut ?? undefined}
                    clearable
                    size='sm'
                    excludeDate={excludeDate}
                    classNames={{ input: classes.bookingInput }}
                />
                {mode === 'nightly' ? (
                    <DatePickerInput
                        label='Check-out'
                        placeholder='Select date'
                        leftSection={<IconCalendar size={16} />}
                        value={checkOut}
                        onChange={onCheckOutChange}
                        minDate={checkIn ?? new Date()}
                        maxDate={checkIn ? dayjs(checkIn).add(NIGHTLY_MAX_NIGHTS, 'day').toDate() : undefined}
                        clearable
                        size='sm'
                        excludeDate={excludeDate}
                        classNames={{ input: classes.bookingInput }}
                    />
                ) : (
                    <>
                        <Select
                            label='Duration'
                            value={String(months)}
                            onChange={v => onMonthsChange(Number(v) || 1)}
                            data={Array.from({ length: 12 }, (_, i) => ({
                                value: String(i + 1),
                                label: `${i + 1} month${i + 1 > 1 ? 's' : ''}`
                            }))}
                            size='sm'
                            classNames={{ input: classes.bookingInput }}
                        />
                        {checkOut && (
                            <Text size='xs' c='dimmed'>
                                Ends {dayjs(checkOut).format('MMM D, YYYY')} · {months} month{months > 1 ? 's' : ''}
                            </Text>
                        )}
                    </>
                )}

                <NumberInput
                    label='Guests'
                    description={`Maximum ${maxGuests} guests`}
                    value={guests}
                    onChange={v => onGuestsChange(Number(v) || 1)}
                    min={1}
                    max={maxGuests}
                    classNames={{ input: classes.bookingInput }}
                />

                {/* Price breakdown — only renders once dates picked */}
                {hasDates && (
                    <>
                        <Divider color='gray.2' />
                        {isQuoteLoading ? (
                            <Stack gap='xs'>
                                <Skeleton height={20} />
                                <Skeleton height={20} />
                            </Stack>
                        ) : (
                            <Stack gap='xs'>
                                {mode === 'monthly' && monthlyPeriods.length > 0 ? (
                                    <MonthlyBreakdownList periods={monthlyPeriods} />
                                ) : (
                                    <div className={classes.bookingBreakdownRow}>
                                        <Text size='sm' className={classes.bookingBreakdownLabel}>
                                            &euro;{avgPerNight.toFixed(2)}
                                            {showQuote ? ' avg' : ''} &times; {nights} night
                                            {nights > 1 ? 's' : ''}
                                        </Text>
                                        <Text size='sm' className={classes.bookingBreakdownValue}>
                                            &euro;{total.toFixed(2)}
                                        </Text>
                                    </div>
                                )}
                                {showQuote && (
                                    <Accordion
                                        variant='subtle'
                                        chevronPosition='right'
                                        classNames={{ control: classes.breakdownControl }}
                                    >
                                        <Accordion.Item value='breakdown'>
                                            <Accordion.Control>
                                                <Text size='xs' c='dimmed'>
                                                    How is this price calculated?
                                                </Text>
                                            </Accordion.Control>
                                            <Accordion.Panel>
                                                <PriceBreakdownList
                                                    breakdown={quote.breakdown}
                                                    durationRuleName={quote.durationDiscount?.ruleName ?? null}
                                                    durationDisplayLabel={
                                                        quote.durationDiscount
                                                            ? durationDiscountLabel(quote.durationDiscount, mode)
                                                            : null
                                                    }
                                                />
                                            </Accordion.Panel>
                                        </Accordion.Item>
                                    </Accordion>
                                )}
                                {showFallback && (
                                    <Text size='xs' c='dimmed'>
                                        Live pricing unavailable — showing base rate.
                                    </Text>
                                )}

                                {showQuote && quote.durationDiscount ? (
                                    <DurationDiscountSummary
                                        discount={quote.durationDiscount}
                                        discountedTotal={total}
                                        mode={mode}
                                    />
                                ) : (
                                    <>
                                        <Divider color='gray.2' />
                                        <div className={classes.bookingBreakdownRow}>
                                            <Text className={classes.bookingTotalLabel}>Total</Text>
                                            <Text className={classes.bookingTotalValue}>&euro;{total.toFixed(2)}</Text>
                                        </div>
                                    </>
                                )}
                            </Stack>
                        )}
                    </>
                )}

                {/* Overlap warning */}
                {hasOverlap && nights > 0 && (
                    <Text size='sm' c='red' fw={500}>
                        Selected dates include unavailable days. Please choose different dates.
                    </Text>
                )}

                {/* CTA — the app is gated, so the visitor is always signed in here */}
                <Button fullWidth size='md' disabled={!canBook} onClick={onBookNow} className={classes.bookingButton}>
                    Book Now
                </Button>
            </Stack>
        </Box>
    );
}

interface PriceBreakdownListProps {
    breakdown: PriceBreakdownNight[];
    /** Raw name of the duration-discount rule (if any) — matches the chip in the breakdown. */
    durationRuleName: string | null;
    /** View-appropriate label to show for that chip (month-named vs week-based). */
    durationDisplayLabel: string | null;
}

/**
 * Renders the per-night accordion content.
 *
 * Layout strategy:
 *   - Rules that apply to EVERY night (intersection across the breakdown,
 *     excluding the synthetic 'ML model' marker) are pulled into a single
 *     chip header at the top — kills the 10× repetition of long rule names.
 *   - Per-night rows show date + locked-width price column. Tabular numerals
 *     keep prices aligned, `nowrap` stops `€58.96` from breaking into two
 *     lines when chips eat horizontal space.
 *   - Night-unique rules (rare — e.g. a Demand spike on a single weekend)
 *     appear as a small chip below the date.
 *   - The chosen duration-discount rule gets a savings-green chip; all
 *     others use a muted amber tone consistent with the booking card.
 */
function PriceBreakdownList({ breakdown, durationRuleName, durationDisplayLabel }: PriceBreakdownListProps) {
    const nightRuleSets = breakdown.map(n => n.appliedRules.filter(r => r !== 'ML model'));
    const allRulesUnion = Array.from(new Set(nightRuleSets.flat()));
    const commonRules = allRulesUnion.filter(rule => nightRuleSets.every(set => set.includes(rule)));
    const isCommon = new Set(commonRules);

    return (
        <Stack gap={10}>
            {commonRules.length > 0 && (
                <div className={classes.commonRulesHeader}>
                    <Text size='xs' className={classes.commonRulesLabel}>
                        Applied every night
                    </Text>
                    <div className={classes.chipRow}>
                        {commonRules.map(rule => {
                            const isDuration = rule === durationRuleName;
                            return (
                                <span
                                    key={rule}
                                    className={`${classes.ruleChip} ${isDuration ? classes.ruleChipDiscount : ''}`}
                                >
                                    {isDuration ? (durationDisplayLabel ?? rule) : rule}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            <Stack gap={4} role='list'>
                {breakdown.map(night => {
                    const uniqueRules = night.appliedRules.filter(r => r !== 'ML model' && !isCommon.has(r));
                    return (
                        <div key={night.date} className={classes.nightRow} role='listitem'>
                            <div className={classes.nightInfo}>
                                <Text size='xs' fw={500} className={classes.nightDate}>
                                    {dayjs(night.date).format('ddd, MMM D')}
                                </Text>
                                {uniqueRules.length > 0 && (
                                    <div className={classes.nightChips}>
                                        {uniqueRules.map(rule => (
                                            <span key={rule} className={classes.ruleChip}>
                                                {rule}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Text size='xs' className={classes.nightPrice}>
                                &euro;{night.price.toFixed(2)}
                            </Text>
                        </div>
                    );
                })}
            </Stack>
        </Stack>
    );
}
