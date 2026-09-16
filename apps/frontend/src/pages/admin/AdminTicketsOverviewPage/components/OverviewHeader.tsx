import { Stack } from '@mantine/core';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { FilterBar } from '@/components/FilterBar/FilterBar';

interface PropertyOption {
    value: string;
    label: string;
}

interface Props {
    properties: PropertyOption[];
    propertyId: string | null;
    onPropertyChange: (id: string | null) => void;
    range: [Date | null, Date | null];
    onRangeChange: (range: [Date | null, Date | null]) => void;
    showClear: boolean;
    onClear: () => void;
}

export function OverviewHeader({
    properties,
    propertyId,
    onPropertyChange,
    range,
    onRangeChange,
    showClear,
    onClear
}: Props) {
    return (
        <Stack gap='md'>
            <PageHeader title='Tickets Overview' subtitle='Resolution speed and workload across all tickets' />

            <FilterBar>
                <FilterBar.Select
                    placeholder='All properties'
                    data={properties}
                    value={propertyId}
                    onChange={onPropertyChange}
                    searchable
                    clearable
                    w={240}
                />
                <FilterBar.DateRange
                    placeholder='Resolution period'
                    value={range}
                    onChange={(v: [Date | null, Date | null]) => onRangeChange(v)}
                    maxDate={new Date()}
                    valueFormat='D MMM YYYY'
                    clearable
                    w={280}
                />
                <FilterBar.Clear show={showClear} onClick={onClear} />
            </FilterBar>
        </Stack>
    );
}
