import { IconCalendarOff } from '@tabler/icons-react';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { NoPropertiesYet } from '@/components/EmptyState/NoPropertiesYet';

interface Props {
    hasFilters: boolean;
    isManagerWithoutProperties: boolean;
}

export function AdminBookingsEmpty({ hasFilters, isManagerWithoutProperties }: Props) {
    if (isManagerWithoutProperties) {
        return <NoPropertiesYet what='bookings' />;
    }

    return (
        <EmptyState
            variant='compact'
            icon={IconCalendarOff}
            title={hasFilters ? 'No bookings match the current filters' : 'No pending bookings'}
            body={hasFilters ? 'Try adjusting or clearing the filters.' : 'All caught up — nothing needs action.'}
        />
    );
}
