import { Button, Stack } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import type { Property } from '@staylark/contract';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { FilterBar } from '@/components/FilterBar/FilterBar';

interface Props {
    properties: Property[];
    selectedPropertyId: string;
    onSelectProperty: (id: string | null) => void;
    dateRange: [Date | null, Date | null];
    onChangeDateRange: (range: [Date | null, Date | null]) => void;
    onBack: () => void;
}

export function FeedbackHeader({
    properties,
    selectedPropertyId,
    onSelectProperty,
    dateRange,
    onChangeDateRange,
    onBack
}: Props) {
    const selectedProperty = properties.find(p => p.id === selectedPropertyId);

    return (
        <Stack gap='md'>
            <Button variant='subtle' leftSection={<IconArrowLeft size={16} />} onClick={onBack} w='fit-content'>
                All Properties
            </Button>

            <PageHeader
                title='Feedback'
                subtitle={selectedProperty ? `${selectedProperty.title} — ${selectedProperty.city}` : undefined}
            />

            <FilterBar>
                <FilterBar.Select
                    placeholder='Switch property'
                    data={properties.map(p => ({ value: p.id, label: `${p.title} — ${p.city}` }))}
                    value={selectedPropertyId}
                    onChange={onSelectProperty}
                    searchable
                    w={280}
                />
                <FilterBar.DateRange
                    placeholder='Date range'
                    value={dateRange}
                    onChange={(v: [Date | null, Date | null]) => onChangeDateRange(v)}
                    maxDate={new Date()}
                    valueFormat='D MMM YYYY'
                    clearable
                    w={280}
                />
            </FilterBar>
        </Stack>
    );
}
