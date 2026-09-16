import { Group, Select, ActionIcon, Tooltip } from '@mantine/core';
import type { SelectProps } from '@mantine/core';
import { IconSortAscending, IconSortDescending } from '@tabler/icons-react';

export interface SortOption {
    value: string;
    label: string;
}

export interface SortControlProps {
    options: SortOption[];
    sortBy: string | null;
    sortOrder: 'asc' | 'desc';
    /** Called with the next (sortBy, sortOrder). sortBy is null when cleared. */
    onChange: (sortBy: string | null, sortOrder: 'asc' | 'desc') => void;
    /** Field used when the user toggles direction while no field is selected. */
    defaultSortBy: string;
    /** Optional shared field styling, injected by FilterBar.Sort. */
    classNames?: SelectProps['classNames'];
}

export function SortControl({ options, sortBy, sortOrder, onChange, defaultSortBy, classNames }: SortControlProps) {
    const toggleOrder = () => onChange(sortBy ?? defaultSortBy, sortOrder === 'asc' ? 'desc' : 'asc');
    return (
        <Group gap='xs' wrap='nowrap'>
            <Select
                placeholder='Sort by'
                data={options}
                value={sortBy}
                onChange={value => onChange(value, sortOrder)}
                clearable
                w={170}
                miw={0}
                classNames={classNames}
                comboboxProps={{ withinPortal: true, zIndex: 200 }}
                aria-label='Sort field'
            />
            <Tooltip label={sortOrder === 'asc' ? 'Ascending' : 'Descending'}>
                <ActionIcon
                    variant='default'
                    size='lg'
                    onClick={toggleOrder}
                    aria-label={`Sort direction: ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                >
                    {sortOrder === 'asc' ? <IconSortAscending size={18} /> : <IconSortDescending size={18} />}
                </ActionIcon>
            </Tooltip>
        </Group>
    );
}
