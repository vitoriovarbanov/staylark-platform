import type { ReactNode } from 'react';
import type { Icon } from '@tabler/icons-react';
import classes from './EmptyState.module.css';

export interface EmptyStateProps {
    /**
     * `panel` — branded navy scanline visual for full-page / primary empties (default).
     * `compact` — lighter, on-brand visual for table rows, chart cards and small panels.
     */
    variant?: 'panel' | 'compact';
    /** Optional Tabler icon component, rendered in an amber-tinted circle (mainly for `compact`). */
    icon?: Icon;
    /** Small amber SF Mono uppercase label. */
    eyebrow?: ReactNode;
    title: ReactNode;
    body?: ReactNode;
    /** Slot for a button / link CTA. */
    action?: ReactNode;
}

/**
 * <EmptyState> — the unified, project-themed "no data" component.
 *
 * Replaces the former ScanlineEmptyState plus the various one-off empty states
 * (EmptyFeedbackState, AdminBookingsEmpty, inline dimmed Text blobs). Keeps the
 * navy + amber + Outfit brand language across both variants.
 */
export function EmptyState({ variant = 'panel', icon: IconComponent, eyebrow, title, body, action }: EmptyStateProps) {
    return (
        <div className={variant === 'panel' ? classes.panel : classes.compact}>
            {IconComponent ? (
                <div className={classes.icon}>
                    <IconComponent size={variant === 'panel' ? 30 : 24} stroke={1.5} />
                </div>
            ) : null}
            {eyebrow ? <div className={classes.eyebrow}>{eyebrow}</div> : null}
            <h2 className={classes.title}>{title}</h2>
            {body ? <p className={classes.body}>{body}</p> : null}
            {action ? <div className={classes.action}>{action}</div> : null}
        </div>
    );
}
