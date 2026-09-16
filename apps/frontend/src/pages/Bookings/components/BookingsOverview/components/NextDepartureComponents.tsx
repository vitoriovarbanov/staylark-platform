import type { BookingWithRelations } from '@/hooks/api/use-bookings';
import { Button, Text } from '@mantine/core';
import { IconArrowRight, IconPlaneDeparture } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { computeStayCountdown, useLiveCountdown } from '../../../utils/bookings.utils';
import classes from '../NextDepartureHero.module.css';

export function StatusRibbon({ booking, reduced }: { booking: BookingWithRelations; reduced: boolean }) {
    if (booking.status === 'CONFIRMED') return <ConfirmedRibbon checkIn={booking.checkIn} />;
    if (booking.status === 'ACTIVE')
        return <ActiveRibbon checkIn={booking.checkIn} checkOut={booking.checkOut} reduced={reduced} />;
    if (booking.status === 'PENDING') return <PendingRibbon />;
    return null;
}

export function ConfirmedRibbon({ checkIn }: { checkIn: string }) {
    const text = useLiveCountdown(checkIn);

    return (
        <>
            <span className={classes.countdownLabel}>Until check-in</span>
            <span className={classes.countdown} aria-live='polite'>
                {text}
            </span>
        </>
    );
}

export function ActiveRibbon({ checkIn, checkOut, reduced }: { checkIn: string; checkOut: string; reduced: boolean }) {
    const { nights, currentNight, isCheckoutDay, checkoutLabel, percent } = computeStayCountdown(checkIn, checkOut);

    return (
        <>
            <div className={classes.progressRow}>
                {isCheckoutDay ? checkoutLabel : `Night ${currentNight} of ${nights} · ${checkoutLabel}`}
            </div>
            <div className={classes.progressTrack} aria-hidden='true'>
                <motion.div
                    className={classes.progressFill}
                    initial={reduced ? { width: `${percent}%` } : { width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.6 }}
                />
            </div>
        </>
    );
}

export function PendingRibbon() {
    return <Text className={classes.pendingText}>Your host will confirm this booking shortly.</Text>;
}

export function EmptyHero() {
    return (
        <EmptyState
            icon={IconPlaneDeparture}
            eyebrow='NO TRIPS SCHEDULED'
            title='Ready for your next adventure?'
            action={
                <Button
                    component={Link}
                    to='/properties'
                    variant='filled'
                    color='amber'
                    rightSection={<IconArrowRight size={16} />}
                >
                    Browse properties
                </Button>
            }
        />
    );
}
