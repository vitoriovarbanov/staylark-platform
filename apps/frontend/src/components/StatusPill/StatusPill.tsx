import type { BookingStatus } from '@staylark/contract';
import classes from './StatusPill.module.css';
import { ActiveTreatment, CompletedStamp, ConfirmedTreatment } from './treatments/TicketStatuses';

interface StatusPillProps {
    status: BookingStatus;
    checkIn: string;
    checkOut: string;
}

export function StatusPill({ status, checkIn, checkOut }: StatusPillProps) {
    if (status === 'PENDING') {
        return (
            <>
                <div className={classes.breathingBorder} aria-hidden='true' />
                <span className={classes.pill} data-variant='pending'>
                    <span className={`${classes.dot} ${classes.dotPulsing}`} aria-hidden='true' />
                    Pending
                </span>
            </>
        );
    }

    if (status === 'CONFIRMED') {
        return <ConfirmedTreatment checkIn={checkIn} />;
    }

    if (status === 'ACTIVE') {
        return <ActiveTreatment checkIn={checkIn} checkOut={checkOut} />;
    }

    if (status === 'COMPLETED') {
        return <CompletedStamp />;
    }

    if (status === 'CANCELLED') {
        return (
            <>
                <div className={classes.hatchOverlay} aria-hidden='true' />
                <span className={classes.pill} data-variant='cancelled'>
                    Cancelled
                </span>
            </>
        );
    }

    return null;
}
