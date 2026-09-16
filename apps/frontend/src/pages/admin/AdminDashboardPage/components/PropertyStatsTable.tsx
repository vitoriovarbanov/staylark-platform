import { Group, Progress, Stack, Text } from '@mantine/core';
import { IconBuildingOff } from '@tabler/icons-react';
import type { AdminPropertyStats } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef } from '@/components/DataTable/types';
import { formatEURCompact } from '@/lib/currency';
import { DashboardSection } from './DashboardSection';

const occupancyColor = (value: number) => (value >= 60 ? 'teal' : value >= 30 ? 'amber' : 'brand');

const columns: ColumnDef<AdminPropertyStats>[] = [
    {
        key: 'property',
        header: 'Property',
        render: p => (
            <Stack gap={0}>
                <Text size='sm' fw={500}>
                    {p.title}
                </Text>
                <Text size='xs' c='dimmed'>
                    {p.city}
                </Text>
            </Stack>
        )
    },
    {
        key: 'occupancy',
        header: 'Occupancy (mo.)',
        width: 180,
        render: p => (
            <Group gap='xs' wrap='nowrap'>
                <Progress value={p.occupancy} w={72} size='sm' radius='xl' color={occupancyColor(p.occupancy)} />
                <Text size='sm' fw={500} w={38}>
                    {p.occupancy}%
                </Text>
            </Group>
        )
    },
    { key: 'revenue', header: 'Booking revenue', mono: true, align: 'right', render: p => formatEURCompact(p.revenue) },
    { key: 'adr', header: 'ADR', mono: true, align: 'right', render: p => formatEURCompact(p.adr) },
    { key: 'bookings', header: 'Bookings', mono: true, align: 'right', render: p => p.bookings },
    { key: 'active', header: 'Active', mono: true, align: 'right', render: p => p.activeBookings },
    {
        key: 'openTickets',
        header: 'Open tickets',
        mono: true,
        align: 'right',
        render: p => (
            <Text size='sm' c={p.openTickets > 0 ? 'red' : undefined} fw={p.openTickets > 0 ? 600 : 400}>
                {p.openTickets}
            </Text>
        )
    }
];

export function PropertyStatsTable({
    properties,
    isLoading
}: {
    properties: AdminPropertyStats[];
    isLoading: boolean;
}) {
    return (
        <DashboardSection
            eyebrow='Portfolio'
            title='Property performance'
            subtitle='Occupancy this month · revenue & ADR from completed stays · all-time bookings'
        >
            <DataTable<AdminPropertyStats>
                data={properties}
                columns={columns}
                isLoading={isLoading}
                getRowKey={p => p.propertyId}
                minWidth={760}
                emptyState={
                    <EmptyState
                        variant='compact'
                        icon={IconBuildingOff}
                        title='No properties yet'
                        body='Add a property to start tracking performance.'
                    />
                }
            />
        </DashboardSection>
    );
}
