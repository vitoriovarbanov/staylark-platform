import { Button, Tooltip } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { Property } from '@staylark/contract';
import { FilterBar } from '@/components/FilterBar/FilterBar';

interface OverridesFilterBarProps {
    properties: Property[];
    propertyId: string | null;
    activeOn: Date | null;
    includeInactive: boolean;
    searchName: string;
    canCreate?: boolean;
    createDisabledReason?: string;
    onChangePropertyId: (value: string | null) => void;
    onChangeActiveOn: (value: Date | null) => void;
    onToggleIncludeInactive: (value: boolean) => void;
    onChangeSearchName: (value: string) => void;
    onCreate: () => void;
}

const ALL_PROPERTIES = '__all__';

export function OverridesFilterBar({
    properties,
    propertyId,
    activeOn,
    includeInactive,
    searchName,
    canCreate = true,
    createDisabledReason,
    onChangePropertyId,
    onChangeActiveOn,
    onToggleIncludeInactive,
    onChangeSearchName,
    onCreate
}: OverridesFilterBarProps) {
    const createButton = (
        <Button
            leftSection={<IconPlus size={16} />}
            onClick={onCreate}
            disabled={!canCreate}
            data-disabled={!canCreate || undefined}
        >
            New override
        </Button>
    );
    return (
        <FilterBar>
            <FilterBar.TextInput
                placeholder='Search by name'
                value={searchName}
                onChange={e => onChangeSearchName(e.currentTarget.value)}
                w={220}
            />
            <FilterBar.Select
                placeholder='All properties'
                data={[
                    { value: ALL_PROPERTIES, label: 'All properties' },
                    ...properties.map(p => ({ value: p.id, label: `${p.title} — ${p.city}` }))
                ]}
                value={propertyId ?? ALL_PROPERTIES}
                onChange={value => onChangePropertyId(value === ALL_PROPERTIES ? null : value)}
                searchable
                w={280}
            />
            <FilterBar.DateInput
                placeholder='Active on date'
                value={activeOn}
                onChange={onChangeActiveOn as (v: Date | null) => void}
                valueFormat='D MMM YYYY'
                clearable
                w={220}
            />
            <FilterBar.Switch
                label='Include inactive'
                checked={includeInactive}
                onChange={e => onToggleIncludeInactive(e.currentTarget.checked)}
            />
            <FilterBar.Actions>
                {canCreate || !createDisabledReason ? (
                    createButton
                ) : (
                    <Tooltip label={createDisabledReason} withinPortal>
                        <span style={{ display: 'inline-flex' }}>{createButton}</span>
                    </Tooltip>
                )}
            </FilterBar.Actions>
        </FilterBar>
    );
}
