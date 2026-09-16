import type { ReactNode } from 'react';
import { Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import type { TicketStats } from '@staylark/contract';
import { formatResolutionHours } from '../utils';

interface Props {
    stats: TicketStats;
    /** Human label for the active resolution window, e.g. "May 8 – Jun 7". */
    periodLabel?: string;
}

function StatCard({
    label,
    value,
    hint,
    color
}: {
    label: string;
    value: string | number;
    hint?: string;
    color?: string;
}) {
    return (
        <Paper p='md' radius='md' withBorder>
            <Stack gap={4}>
                <Text size='sm' c='dimmed' fw={500}>
                    {label}
                </Text>
                <Text size='2rem' fw={700} lh={1} c={color}>
                    {value}
                </Text>
                {hint && (
                    <Text size='xs' c='dimmed'>
                        {hint}
                    </Text>
                )}
            </Stack>
        </Paper>
    );
}

function SectionLabel({ children, note }: { children: ReactNode; note?: string }) {
    return (
        <Group gap='xs' align='baseline'>
            <Text size='sm' fw={700} tt='uppercase' c='dimmed' lts={0.5}>
                {children}
            </Text>
            {note && (
                <Text size='xs' c='dimmed'>
                    {note}
                </Text>
            )}
        </Group>
    );
}

/**
 * Two clearly separated groups:
 * - Current backlog — live counts, independent of the date filter.
 * - Resolution — scoped to the selected resolution period.
 */
export function TicketStatCards({ stats, periodLabel }: Props) {
    return (
        <Stack gap='lg'>
            <Stack gap='xs'>
                <SectionLabel note='live · current state'>Current backlog</SectionLabel>
                <SimpleGrid cols={{ base: 1, xs: 3 }} spacing='md'>
                    <StatCard label='Open' value={stats.statusCounts.open} />
                    <StatCard label='In Progress' value={stats.statusCounts.inProgress} />
                    <StatCard
                        label='Urgent Open'
                        value={stats.urgentOpenCount}
                        hint='critical or emergency'
                        color={stats.urgentOpenCount > 0 ? 'red.7' : undefined}
                    />
                </SimpleGrid>
            </Stack>

            <Stack gap='xs'>
                <SectionLabel note={periodLabel ? `selected period · ${periodLabel}` : 'selected period'}>
                    Resolution
                </SectionLabel>
                <SimpleGrid cols={{ base: 1, xs: 3 }} spacing='md'>
                    <StatCard label='Resolved' value={stats.resolvedInRange} />
                    <StatCard label='Avg Resolution' value={formatResolutionHours(stats.avgResolutionHours)} />
                    <StatCard label='Median Resolution' value={formatResolutionHours(stats.medianResolutionHours)} />
                </SimpleGrid>
            </Stack>
        </Stack>
    );
}
