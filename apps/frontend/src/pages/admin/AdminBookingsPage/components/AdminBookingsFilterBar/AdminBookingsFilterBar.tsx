import { IconSearch, IconCalendar } from '@tabler/icons-react';
import { FilterBar } from '@/components/FilterBar/FilterBar';
import type { SortOption } from '@/components/SortControl/SortControl';

const SORT_OPTIONS: SortOption[] = [
    { value: 'createdAt', label: 'Date booked' },
    { value: 'checkIn', label: 'Check-in' },
    { value: 'status', label: 'Status' }
];

export interface AdminBookingsFilterBarProps {
    propertyId: string;
    onPropertyIdChange: (v: string) => void;
    propertyOptions: { value: string; label: string }[];
    guestName: string;
    onGuestNameChange: (v: string) => void;
    dateRange: [Date | null, Date | null];
    onDateRangeChange: (v: [Date | null, Date | null]) => void;
    sortBy: string | null;
    sortOrder: 'asc' | 'desc';
    onSortChange: (sortBy: string | null, sortOrder: 'asc' | 'desc') => void;
}

export function AdminBookingsFilterBar(props: AdminBookingsFilterBarProps) {
    return (
        <FilterBar>
            <FilterBar.Select
                placeholder='All properties'
                data={props.propertyOptions}
                value={props.propertyId}
                onChange={v => props.onPropertyIdChange(v ?? '')}
                searchable
                clearable
                w={220}
            />
            <FilterBar.DateRange
                placeholder='Check-in range'
                leftSection={<IconCalendar size={16} />}
                value={props.dateRange}
                onChange={props.onDateRangeChange}
                clearable
                w={260}
            />
            <FilterBar.TextInput
                placeholder='Search guest name…'
                leftSection={<IconSearch size={16} />}
                value={props.guestName}
                onChange={e => props.onGuestNameChange(e.currentTarget.value)}
                w={220}
            />
            <FilterBar.Sort
                options={SORT_OPTIONS}
                sortBy={props.sortBy}
                sortOrder={props.sortOrder}
                onChange={props.onSortChange}
                defaultSortBy='createdAt'
            />
        </FilterBar>
    );
}
