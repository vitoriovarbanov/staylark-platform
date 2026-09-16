import { Text, Tooltip } from '@mantine/core';
import { IconCalendarOff } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { AdminRecentBooking } from '@staylark/contract';
import { StatusBadge } from '@/components/StatusPill/StatusBadge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef } from '@/components/DataTable/types';
import { formatEURCompact } from '@/lib/currency';
import { DashboardSection } from './DashboardSection';
import { ViewAllLink } from './ViewAllLink';
import '@/components/DataTable/DataTable.statuses.module.css';

const fmt = (d: string) => dayjs(d).format('D MMM YYYY');

// Compact range: drop the redundant month/year on the check-in when shared with
// check-out, so the cell stays on one line. e.g. "7 – 14 Jun 2026".
function compactRange(checkIn: string, checkOut: string): string {
    const a = dayjs(checkIn);
    const b = dayjs(checkOut);
    if (a.isSame(b, 'month')) return `${a.format('D')} – ${b.format('D MMM YYYY')}`;
    if (a.isSame(b, 'year')) return `${a.format('D MMM')} – ${b.format('D MMM YYYY')}`;
    return `${fmt(checkIn)} – ${fmt(checkOut)}`;
}

const columns: ColumnDef<AdminRecentBooking>[] = [
    { key: 'property', header: 'Property', render: b => b.propertyTitle },
    { key: 'guest', header: 'Guest', render: b => b.guestName },
    {
        key: 'dates',
        header: 'Dates',
        mono: true,
        render: b => {
            const nights = dayjs(b.checkOut).diff(dayjs(b.checkIn), 'day');
            const full = `${fmt(b.checkIn)} – ${fmt(b.checkOut)} (${nights} night${nights === 1 ? '' : 's'} total)`;
            return (
                <Tooltip label={full} withArrow>
                    <Text component='span' size='sm' style={{ whiteSpace: 'nowrap' }}>
                        {compactRange(b.checkIn, b.checkOut)}
                    </Text>
                </Tooltip>
            );
        }
    },
    { key: 'total', header: 'Total', mono: true, align: 'right', render: b => formatEURCompact(b.totalPrice) },
    { key: 'status', header: 'Status', render: b => <StatusBadge status={b.status} /> }
];

export function RecentBookingsTable({ bookings }: { bookings: AdminRecentBooking[] }) {
    return (
        <DashboardSection eyebrow='Pipeline' title='Recent bookings' action={<ViewAllLink to='/admin/bookings' />}>
            <DataTable<AdminRecentBooking>
                data={bookings}
                columns={columns}
                getRowKey={b => b.id}
                getRowAttributes={b => ({ 'data-status': b.status })}
                minWidth={520}
                emptyState={
                    <EmptyState
                        variant='compact'
                        icon={IconCalendarOff}
                        title='No bookings yet'
                        body='Recent bookings will show up here as guests book.'
                    />
                }
            />
        </DashboardSection>
    );
}
