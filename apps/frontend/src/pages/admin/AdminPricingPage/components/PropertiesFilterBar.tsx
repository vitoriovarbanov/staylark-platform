import type { PropertyType } from '@staylark/contract';
import { FilterBar } from '@/components/FilterBar/FilterBar';

interface PropertiesFilterBarProps {
    cities: string[];
    city: string | null;
    type: PropertyType | null;
    onChangeCity: (value: string | null) => void;
    onChangeType: (value: PropertyType | null) => void;
    rightSection?: React.ReactNode;
}

const ALL_CITIES = '__all_cities__';
const ALL_TYPES = '__all_types__';

const TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'HOUSE', label: 'House' },
    { value: 'HOTEL', label: 'Hotel' }
];

export function PropertiesFilterBar({
    cities,
    city,
    type,
    onChangeCity,
    onChangeType,
    rightSection
}: PropertiesFilterBarProps) {
    return (
        <FilterBar>
            <FilterBar.Select
                placeholder='All cities'
                data={[{ value: ALL_CITIES, label: 'All cities' }, ...cities.map(c => ({ value: c, label: c }))]}
                value={city ?? ALL_CITIES}
                onChange={value => onChangeCity(value === ALL_CITIES ? null : value)}
                searchable
                w={220}
            />
            <FilterBar.Select
                placeholder='All types'
                data={[{ value: ALL_TYPES, label: 'All types' }, ...TYPE_OPTIONS]}
                value={type ?? ALL_TYPES}
                onChange={value => onChangeType(value === ALL_TYPES ? null : (value as PropertyType))}
                w={180}
            />
            {rightSection && <FilterBar.Actions>{rightSection}</FilterBar.Actions>}
        </FilterBar>
    );
}
