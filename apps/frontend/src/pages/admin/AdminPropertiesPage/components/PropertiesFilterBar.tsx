import { IconSearch } from '@tabler/icons-react';
import { PropertyTypeEnum, type PropertyType } from '@staylark/contract';
import { FilterBar } from '@/components/FilterBar/FilterBar';
import type { SortOption } from '@/components/SortControl/SortControl';

const TYPE_OPTIONS: Array<{ value: PropertyType; label: string }> = PropertyTypeEnum.options.map(value => ({
    value,
    label: value.charAt(0) + value.slice(1).toLowerCase()
}));

const SORT_OPTIONS: SortOption[] = [
    { value: 'title', label: 'Title' },
    { value: 'city', label: 'City' },
    { value: 'basePrice', label: 'Price' },
    { value: 'createdAt', label: 'Date added' }
];

interface PropertiesFilterBarProps {
    city: string;
    type: PropertyType | null;
    sortBy: string | null;
    sortOrder: 'asc' | 'desc';
    onChangeCity: (value: string) => void;
    onChangeType: (value: PropertyType | null) => void;
    onSortChange: (sortBy: string | null, sortOrder: 'asc' | 'desc') => void;
    onClear: () => void;
}

export function PropertiesFilterBar({
    city,
    type,
    sortBy,
    sortOrder,
    onChangeCity,
    onChangeType,
    onSortChange,
    onClear
}: PropertiesFilterBarProps) {
    const hasAny = Boolean(city || type || sortBy);

    return (
        <FilterBar>
            <FilterBar.TextInput
                placeholder='Search city'
                leftSection={<IconSearch size={16} />}
                value={city}
                onChange={e => onChangeCity(e.currentTarget.value)}
                w={220}
            />
            <FilterBar.Select
                placeholder='Type'
                data={TYPE_OPTIONS}
                value={type}
                onChange={v => onChangeType((v as PropertyType) ?? null)}
                clearable
                w={170}
            />
            <FilterBar.Sort
                options={SORT_OPTIONS}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onChange={onSortChange}
                defaultSortBy='createdAt'
            />
            <FilterBar.Clear show={hasAny} onClick={onClear} />
        </FilterBar>
    );
}
