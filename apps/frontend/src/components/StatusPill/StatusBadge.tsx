import type { BookingStatus } from '@staylark/contract';
import classes from './StatusBadge.module.css';

interface StatusBadgeProps {
    status: BookingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <span className={classes.badge} data-status={status}>
            {status}
        </span>
    );
}
