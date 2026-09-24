import type { ReactNode } from 'react';
import type { Icon } from '@tabler/icons-react';
import { RooflineField } from '@/components/RooflineField/RooflineField';
import classes from './EmptyState.module.css';

export interface EmptyStateProps {

    variant?: 'panel' | 'compact';
    icon?: Icon;
    eyebrow?: ReactNode;
    title: ReactNode;
    body?: ReactNode;
    action?: ReactNode;
}

export function EmptyState({ variant = 'panel', icon: IconComponent, eyebrow, title, body, action }: EmptyStateProps) {
    return (
        <div className={variant === 'panel' ? classes.panel : classes.compact}>
            {variant === 'panel' && <RooflineField tone='dusk' placement='bottom' contained className={classes.village} />}
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
