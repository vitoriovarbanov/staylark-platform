import { Box, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import type { TicketStats } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { priorityColor, categoryColor, titleCase } from '../utils';

interface Props {
    stats: TicketStats;
}

interface Slice {
    name: string;
    value: number;
    color: string; // mantine token e.g. 'red.7'
}

function tokenToVar(token: string): string {
    const [hue, shade] = token.split('.');
    return `var(--mantine-color-${hue}-${shade ?? '6'})`;
}

function BreakdownCard({ title, slices }: { title: string; slices: Slice[] }) {
    const total = slices.reduce((s, x) => s + x.value, 0);
    return (
        <Paper p='md' radius='md' withBorder>
            <Stack gap='xs'>
                <Text size='sm' c='dimmed' fw={500}>
                    {title}
                </Text>
                {total === 0 ? (
                    <EmptyState variant='compact' title='No active tickets' />
                ) : (
                    <Group justify='center' align='center' gap='lg' wrap='wrap'>
                        <DonutChart
                            size={120}
                            thickness={18}
                            withTooltip
                            data={slices.map(s => ({ name: s.name, value: s.value, color: s.color }))}
                        />
                        <Stack gap={6} style={{ flexShrink: 0 }}>
                            {slices.map(s => {
                                const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                                return (
                                    <Group key={s.name} gap='xs' wrap='nowrap'>
                                        <Box
                                            w={10}
                                            h={10}
                                            style={{ borderRadius: 2, background: tokenToVar(s.color), flexShrink: 0 }}
                                        />
                                        <Text size='xs' c='dimmed' style={{ minWidth: 90 }}>
                                            {s.name}
                                        </Text>
                                        <Text size='xs' fw={600}>
                                            {s.value}
                                        </Text>
                                        <Text size='xs' c='dimmed'>
                                            ({pct}%)
                                        </Text>
                                    </Group>
                                );
                            })}
                        </Stack>
                    </Group>
                )}
            </Stack>
        </Paper>
    );
}

/** Donut breakdowns of the active backlog by priority and by category. */
export function TicketBreakdownCharts({ stats }: Props) {
    const prioritySlices: Slice[] = stats.byPriority.map(p => ({
        name: titleCase(p.priority),
        value: p.count,
        color: priorityColor(p.priority)
    }));
    const categorySlices: Slice[] = stats.byCategory.map(c => ({
        name: titleCase(c.category),
        value: c.count,
        color: categoryColor(c.category)
    }));

    return (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing='md'>
            <BreakdownCard title='Active by Priority' slices={prioritySlices} />
            <BreakdownCard title='Active by Category' slices={categorySlices} />
        </SimpleGrid>
    );
}
