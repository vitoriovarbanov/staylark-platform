import type { ReactNode } from 'react';
import { Tabs, Group } from '@mantine/core';
import classes from './BookingStatusTabsList.module.css';

export interface BookingStatusTabItem {
    value: string;
    label: ReactNode;
    count?: ReactNode;
}

interface Props {
    tabs: BookingStatusTabItem[];
}

export function BookingStatusTabsList({ tabs }: Props) {
    return (
        <Tabs.List classNames={{ list: classes.tabsList }}>
            {tabs.map(t => (
                <Tabs.Tab key={t.value} value={t.value} className={classes.tab}>
                    {t.count ? (
                        <Group gap={6} wrap='nowrap'>
                            {t.label}
                            {t.count}
                        </Group>
                    ) : (
                        t.label
                    )}
                </Tabs.Tab>
            ))}
        </Tabs.List>
    );
}
