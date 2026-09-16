import { useState } from 'react';
import { Stack, Pagination, Center, Tabs, Button } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { BookingSortField, BookingStatus } from '@staylark/contract';
import { useAuth } from '@/contexts/auth-context';
import { useBookings } from '@/hooks/api/use-bookings';
import { useProperties } from '@/hooks/api/use-properties';
import { BookingStatusTabsList } from '@/components/BookingStatusTabs/BookingStatusTabsList';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { BulkActionBar } from '@/components/BulkActionBar/BulkActionBar';
import { AdminBookingsFilterBar } from './components/AdminBookingsFilterBar/AdminBookingsFilterBar';
import { AdminBookingsTable } from './components/AdminBookingsTable/AdminBookingsTable';
import { AdminBookingsConfirmModal } from './components/AdminBookingsConfirmModal';
import { AdminBookingsEmpty } from './components/AdminBookingsEmpty';
import { AdminStatusCount } from './components/AdminStatusCount/AdminStatusCount';
import { useAdminBookingsBulk } from './hooks/use-admin-bookings-bulk';

const STATUS_PRIORITY: Record<BookingStatus, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    ACTIVE: 2,
    COMPLETED: 3,
    CANCELLED: 4
};

const ALL_TAB = 'all';

const STATUS_TABS: { value: BookingStatus; label: string }[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
];

export function AdminBookingsPage() {
    const [status, setStatus] = useState<'' | BookingStatus>('');
    const [propertyId, setPropertyId] = useState<string>('');
    const [guestName, setGuestName] = useState('');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [sortBy, setSortBy] = useState<BookingSortField | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);

    const [rangeStart, rangeEnd] = dateRange;
    const filters = {
        ...(status && { status }),
        ...(propertyId && { propertyId }),
        ...(guestName && { guestName }),
        ...(rangeStart && { checkInFrom: dayjs(rangeStart).format('YYYY-MM-DD') }),
        ...(rangeEnd && { checkInTo: dayjs(rangeEnd).format('YYYY-MM-DD') }),
        ...(sortBy && { sortBy, sortOrder }),
        page,
        limit: 20
    };

    const { user } = useAuth();
    const { data: bookingsData, isLoading } = useBookings(filters);
    const { data: propertiesData } = useProperties({ page: 1, limit: 100 });

    const propertyOptions = [
        { value: '', label: 'All Properties' },
        ...(propertiesData?.data?.map(p => ({ value: p.id, label: p.title })) ?? [])
    ];

    const rawRows = bookingsData?.data ?? [];
    // When the user picks an explicit sort, trust the server ordering. Only apply
    // the default client-side status grouping when no sort field is selected.
    const rows = sortBy
        ? rawRows
        : [...rawRows].sort((a, b) => {
              const p = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
              if (p !== 0) return p;
              return dayjs(b.createdAt).diff(dayjs(a.createdAt));
          });
    const totalPages = Math.ceil((bookingsData?.total || 0) / 20);
    const hasFilters = Boolean(status || propertyId || guestName || rangeStart || rangeEnd);
    const isManagerWithoutProperties = user?.role === 'MANAGER' && (propertiesData?.data?.length ?? 0) === 0;

    const bulk = useAdminBookingsBulk(rows);

    return (
        <Stack gap='lg'>
            <PageHeader
                title='Manage Bookings'
                subtitle='Confirm pending requests, triage cancellations, and notify guests by email.'
            />

            <Tabs
                value={status === '' ? ALL_TAB : status}
                onChange={v => {
                    setStatus(v === ALL_TAB || v == null ? '' : (v as BookingStatus));
                    setPage(1);
                }}
            >
                <BookingStatusTabsList
                    tabs={[
                        { value: ALL_TAB, label: 'All' },
                        ...STATUS_TABS.map(t => ({
                            value: t.value,
                            label: t.label,
                            count: (
                                <AdminStatusCount
                                    status={t.value}
                                    propertyId={propertyId || undefined}
                                    guestName={guestName || undefined}
                                />
                            )
                        }))
                    ]}
                />
            </Tabs>

            <AdminBookingsFilterBar
                propertyId={propertyId}
                onPropertyIdChange={v => {
                    setPropertyId(v);
                    setPage(1);
                }}
                propertyOptions={propertyOptions}
                guestName={guestName}
                onGuestNameChange={v => {
                    setGuestName(v);
                    setPage(1);
                }}
                dateRange={dateRange}
                onDateRangeChange={v => {
                    setDateRange(v);
                    setPage(1);
                }}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={(nextSortBy, nextSortOrder) => {
                    setSortBy(nextSortBy as BookingSortField | null);
                    setSortOrder(nextSortOrder);
                    setPage(1);
                }}
            />

            <AdminBookingsTable
                rows={rows}
                isLoading={isLoading}
                selectedIds={bulk.selectedIds}
                onToggleRow={bulk.toggleRow}
                onToggleAll={bulk.toggleAll}
                onConfirmRow={bulk.openSingleConfirm}
                onCancelRow={bulk.cancelOne}
                pendingActionIds={bulk.pendingActionIds}
            />

            {!isLoading && rows.length === 0 && (
                <AdminBookingsEmpty hasFilters={hasFilters} isManagerWithoutProperties={isManagerWithoutProperties} />
            )}

            {totalPages > 1 && (
                <Center>
                    <Pagination value={page} onChange={setPage} total={totalPages} />
                </Center>
            )}

            <AdminBookingsConfirmModal
                opened={bulk.confirmTargets.length > 0}
                bookings={bulk.confirmTargets}
                onClose={bulk.closeConfirm}
                onConfirm={bulk.runConfirm}
                submitting={bulk.pendingActionIds.size > 0}
            />
            <BulkActionBar
                count={bulk.selectedIds.size}
                label={`${bulk.selectedIds.size} booking${bulk.selectedIds.size === 1 ? '' : 's'} selected`}
                onClear={bulk.clearSelection}
            >
                <Button
                    size='sm'
                    leftSection={<IconCheck size={14} />}
                    onClick={bulk.openBulkConfirm}
                    styles={{
                        root: {
                            background: 'var(--mantine-color-amber-6, #e8a838)',
                            color: 'var(--mantine-color-navy-9, #2E1027)'
                        }
                    }}
                >
                    Confirm selected
                </Button>
                <Button
                    size='sm'
                    color='red'
                    variant='light'
                    leftSection={<IconX size={14} />}
                    onClick={bulk.cancelBulk}
                >
                    Cancel selected
                </Button>
            </BulkActionBar>
        </Stack>
    );
}
