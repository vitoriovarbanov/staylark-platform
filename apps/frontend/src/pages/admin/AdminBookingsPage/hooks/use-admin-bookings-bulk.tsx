import { useCallback, useState } from 'react';
import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useConfirmBooking, useCancelBooking, type BookingWithRelations } from '@/hooks/api/use-bookings';
import { useTableSelection } from '@/hooks/use-table-selection';

interface UseAdminBookingsBulkResult {
    selectedIds: Set<string>;
    selectedRows: BookingWithRelations[];
    pendingActionIds: Set<string>;
    confirmTargets: BookingWithRelations[];
    toggleRow: (id: string) => void;
    toggleAll: (checked: boolean) => void;
    clearSelection: () => void;
    openSingleConfirm: (b: BookingWithRelations) => void;
    openBulkConfirm: () => void;
    closeConfirm: () => void;
    runConfirm: (notify: boolean) => Promise<void>;
    cancelOne: (b: BookingWithRelations) => void;
    cancelBulk: () => void;
}

export function useAdminBookingsBulk(rows: BookingWithRelations[]): UseAdminBookingsBulkResult {
    const { selectedIds, selectedRows, toggleRow, toggleAll, clearSelection } = useTableSelection<BookingWithRelations>(
        rows,
        r => r.id,
        r => r.status === 'PENDING'
    );

    const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(new Set());
    const [confirmTargets, setConfirmTargets] = useState<BookingWithRelations[]>([]);

    const confirmMutation = useConfirmBooking();
    const cancelMutation = useCancelBooking();

    const openSingleConfirm = useCallback((b: BookingWithRelations) => setConfirmTargets([b]), []);

    const openBulkConfirm = useCallback(() => {
        setConfirmTargets(selectedRows.filter(r => r.status === 'PENDING'));
    }, [selectedRows]);

    const closeConfirm = useCallback(() => setConfirmTargets([]), []);

    const runConfirm = useCallback(
        async (notify: boolean) => {
            const targets = confirmTargets;
            if (targets.length === 0) return;
            setPendingActionIds(new Set(targets.map(t => t.id)));
            const results = await Promise.allSettled(
                targets.map(t => confirmMutation.mutateAsync({ id: t.id, notify }))
            );
            setPendingActionIds(new Set());
            setConfirmTargets([]);
            clearSelection();
            const failed = results.filter(r => r.status === 'rejected').length;
            const ok = results.length - failed;
            if (failed === 0) {
                notifications.show({
                    title: 'Confirmed',
                    message: `${ok} booking${ok === 1 ? '' : 's'} confirmed${notify ? ' and guest notified' : ''}.`,
                    color: 'green'
                });
            } else {
                notifications.show({
                    title: 'Partial failure',
                    message: `${ok} confirmed, ${failed} failed. Refresh and retry the failed rows.`,
                    color: 'orange'
                });
            }
        },
        [confirmTargets, confirmMutation, clearSelection]
    );

    const cancelOne = useCallback(
        (b: BookingWithRelations) => {
            modals.openConfirmModal({
                title: 'Cancel Booking',
                children: (
                    <Text size='sm'>
                        Are you sure you want to cancel this booking at {b.property.title}? This cannot be undone.
                    </Text>
                ),
                labels: { confirm: 'Cancel Booking', cancel: 'Keep Booking' },
                confirmProps: { color: 'red' },
                onConfirm: async () => {
                    setPendingActionIds(new Set([b.id]));
                    try {
                        await cancelMutation.mutateAsync(b.id);
                        notifications.show({
                            title: 'Booking cancelled',
                            message: 'The booking has been cancelled.',
                            color: 'orange'
                        });
                    } catch {
                        notifications.show({
                            title: 'Cancel failed',
                            message: 'Could not cancel the booking. Please try again.',
                            color: 'red'
                        });
                    } finally {
                        setPendingActionIds(new Set());
                    }
                }
            });
        },
        [cancelMutation]
    );

    const cancelBulk = useCallback(() => {
        const targets = selectedRows.filter(r => r.status === 'PENDING');
        if (targets.length === 0) return;
        modals.openConfirmModal({
            title: `Cancel ${targets.length} booking${targets.length === 1 ? '' : 's'}?`,
            children: <Text size='sm'>This cannot be undone.</Text>,
            labels: { confirm: 'Cancel bookings', cancel: 'Keep' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                setPendingActionIds(new Set(targets.map(t => t.id)));
                const results = await Promise.allSettled(targets.map(t => cancelMutation.mutateAsync(t.id)));
                setPendingActionIds(new Set());
                clearSelection();
                const failed = results.filter(r => r.status === 'rejected').length;
                const ok = results.length - failed;
                notifications.show({
                    title: failed === 0 ? 'Cancelled' : 'Partial failure',
                    message:
                        failed === 0
                            ? `${ok} booking${ok === 1 ? '' : 's'} cancelled.`
                            : `${ok} cancelled, ${failed} failed.`,
                    color: failed === 0 ? 'orange' : 'red'
                });
            }
        });
    }, [selectedRows, cancelMutation, clearSelection]);

    return {
        selectedIds,
        selectedRows,
        pendingActionIds,
        confirmTargets,
        toggleRow,
        toggleAll,
        clearSelection,
        openSingleConfirm,
        openBulkConfirm,
        closeConfirm,
        runConfirm,
        cancelOne,
        cancelBulk
    };
}
