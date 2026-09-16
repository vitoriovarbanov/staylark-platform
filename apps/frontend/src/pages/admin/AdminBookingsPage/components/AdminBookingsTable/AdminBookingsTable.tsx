import { Button, Group, Tooltip } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { BookingStatus, CancellationReason } from '@staylark/contract';
import type { BookingWithRelations } from '@/hooks/api/use-bookings';
import { StatusBadge } from '@/components/StatusPill/StatusBadge';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef } from '@/components/DataTable/types';
import '@/components/DataTable/DataTable.statuses.module.css';
import classes from './AdminBookingsTable.module.css';

const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
    MANUAL_GUEST: 'Cancelled by guest',
    MANUAL_ADMIN: 'Cancelled by admin/manager',
    AUTO_EXPIRED_NO_CONFIRMATION: 'Auto-cancelled — not confirmed in time'
};

interface Props {
    rows: BookingWithRelations[];
    isLoading: boolean;
    selectedIds: Set<string>;
    onToggleRow: (id: string) => void;
    onToggleAll: (checked: boolean) => void;
    onConfirmRow: (b: BookingWithRelations) => void;
    onCancelRow: (b: BookingWithRelations) => void;
    pendingActionIds: Set<string>;
}

function StatusCell({
    status,
    cancellationReason
}: {
    status: BookingStatus;
    cancellationReason?: CancellationReason;
}) {
    const badge = <StatusBadge status={status} />;
    if (status === 'CANCELLED' && cancellationReason) {
        return (
            <Tooltip label={CANCELLATION_REASON_LABELS[cancellationReason]} withArrow>
                <span>{badge}</span>
            </Tooltip>
        );
    }
    return badge;
}

export function AdminBookingsTable({
    rows,
    isLoading,
    selectedIds,
    onToggleRow,
    onToggleAll,
    onConfirmRow,
    onCancelRow,
    pendingActionIds
}: Props) {
    const columns: ColumnDef<BookingWithRelations>[] = [
        { key: 'guest', header: 'GUEST', render: b => b.user?.name || '—' },
        { key: 'property', header: 'PROPERTY', render: b => b.property.title },
        { key: 'checkIn', header: 'CHECK-IN', mono: true, render: b => dayjs(b.checkIn).format('D MMM YYYY') },
        { key: 'checkOut', header: 'CHECK-OUT', mono: true, render: b => dayjs(b.checkOut).format('D MMM YYYY') },
        {
            key: 'nights',
            header: 'NIGHTS',
            mono: true,
            render: b => dayjs(b.checkOut).diff(dayjs(b.checkIn), 'day')
        },
        { key: 'guests', header: 'GUESTS', mono: true, render: b => b.guests },
        { key: 'total', header: 'TOTAL', mono: true, render: b => `€${b.totalPrice}` },
        {
            key: 'status',
            header: 'STATUS',
            render: b => <StatusCell status={b.status} cancellationReason={b.cancellationReason ?? undefined} />
        },
        {
            key: 'actions',
            header: 'ACTIONS',
            render: b => {
                const isPending = b.status === 'PENDING';
                const isLoadingRow = pendingActionIds.has(b.id);
                return (
                    <Group gap='xs' wrap='nowrap'>
                        {isPending && (
                            <Button
                                size='xs'
                                variant='light'
                                className={classes.confirmBtn}
                                leftSection={<IconCheck size={14} />}
                                onClick={() => onConfirmRow(b)}
                                loading={isLoadingRow}
                            >
                                Confirm
                            </Button>
                        )}
                        {(isPending || b.status === 'CONFIRMED') && (
                            <Button
                                size='xs'
                                variant='light'
                                color='red'
                                leftSection={<IconX size={14} />}
                                onClick={() => onCancelRow(b)}
                                loading={isLoadingRow}
                            >
                                Cancel
                            </Button>
                        )}
                    </Group>
                );
            }
        }
    ];

    return (
        <DataTable<BookingWithRelations>
            data={rows}
            columns={columns}
            isLoading={isLoading}
            getRowKey={b => b.id}
            getRowAttributes={b => ({ 'data-status': b.status })}
            selection={{
                selectedIds,
                isSelectable: r => r.status === 'PENDING',
                onToggleRow,
                onToggleAll
            }}
            pendingActionIds={pendingActionIds}
            minWidth={1000}
        />
    );
}
