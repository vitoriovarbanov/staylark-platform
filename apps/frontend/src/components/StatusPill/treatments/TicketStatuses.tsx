import { motion } from 'motion/react';
import { computeStayCountdown, prefersReducedMotion, useLiveCountdown } from '@/pages/Bookings/utils/bookings.utils';
import classes from '../StatusPill.module.css';

export function ConfirmedTreatment({ checkIn }: { checkIn: string }) {
    const countdown = useLiveCountdown(checkIn);

    return (
        <>
            <svg className={classes.arc} viewBox='0 0 120 120' aria-hidden='true'>
                <path
                    d='M 120 0 A 120 120 0 0 0 0 120'
                    fill='none'
                    stroke='var(--mantine-other-amber-accent)'
                    strokeWidth='1.5'
                />
                <path
                    d='M 120 30 A 90 90 0 0 0 30 120'
                    fill='none'
                    stroke='var(--mantine-other-amber-accent)'
                    strokeWidth='1'
                    opacity='0.6'
                />
            </svg>
            <span className={classes.pill} data-variant='confirmed' aria-live='polite'>
                {countdown}
            </span>
        </>
    );
}

export function ActiveTreatment({ checkIn, checkOut }: { checkIn: string; checkOut: string }) {
    const { nights, currentNight, isCheckoutDay, checkoutLabel, percent } = computeStayCountdown(checkIn, checkOut);
    const reduced = prefersReducedMotion();

    return (
        <>
            <span className={classes.pill} data-variant='active'>
                <span className={`${classes.dot} ${classes.dotPulsing}`} aria-hidden='true' />
                {isCheckoutDay ? checkoutLabel : `Night ${currentNight}/${nights}`}
            </span>
            <div className={classes.progressTrack} aria-hidden='true'>
                <motion.div
                    className={classes.progressFill}
                    initial={reduced ? { width: `${percent}%` } : { width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.35 }}
                />
            </div>
        </>
    );
}

export function CompletedStamp() {
    const reduced = prefersReducedMotion();
    return (
        <motion.span
            className={classes.stamp}
            initial={reduced ? { opacity: 1, scale: 1, rotate: -12 } : { opacity: 0, scale: 1.6, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            transition={{ duration: 0.55, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden='true'
        >
            Stayed
        </motion.span>
    );
}
