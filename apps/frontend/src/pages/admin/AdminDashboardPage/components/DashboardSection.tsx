import type { ReactNode } from 'react';
import { Paper, Text, Title } from '@mantine/core';
import classes from './DashboardSection.module.css';

interface DashboardSectionProps {
    /** Short SF-Mono label above the title (e.g. "PORTFOLIO", "ALERTS"). */
    eyebrow: string;
    title: string;
    subtitle?: ReactNode;
    /** Right-aligned slot, typically a "View all" anchor. */
    action?: ReactNode;
    children: ReactNode;
}

export function DashboardSection({ eyebrow, title, subtitle, action, children }: DashboardSectionProps) {
    return (
        <Paper p='lg' radius='md' withBorder>
            <div className={classes.header}>
                <div>
                    <span className={classes.eyebrow}>
                        <span className={classes.tick} aria-hidden='true' />
                        {eyebrow}
                    </span>
                    <Title order={4} ff='Outfit' fw={600} lh={1.15}>
                        {title}
                    </Title>
                    {subtitle ? (
                        <Text size='xs' c='dimmed' mt={4}>
                            {subtitle}
                        </Text>
                    ) : null}
                </div>
                {action}
            </div>
            {children}
        </Paper>
    );
}
