import { useBookings } from '@/hooks/api/use-bookings';
import { Badge } from '@mantine/core';
import type { BookingStatus } from '@staylark/contract';

export function AdminStatusCount({
    status,
    propertyId,
    guestName
}: {
    status: BookingStatus;
    propertyId?: string;
    guestName?: string;
}) {
    const { data } = useBookings({
        status,
        ...(propertyId && { propertyId }),
        ...(guestName && { guestName }),
        page: 1,
        limit: 1
    });
    const total = data?.total ?? 0;
    if (!total) return null;

    return (
        <Badge size='md' variant='filled' circle>
            {total}
        </Badge>
    );
}
