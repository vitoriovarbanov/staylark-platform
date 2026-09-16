import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { FeedbackSortField } from '@staylark/contract';
import { useProperties } from '@/hooks/api/use-properties';
import { useFeedbackAggregation } from '@/hooks/api/use-feedback';
import { SortControl } from '@/components/SortControl/SortControl';
import { PropertyPickerGrid } from './components/PropertyPickerGrid';
import { FeedbackHeader } from './components/FeedbackHeader';
import { FeedbackStatCards } from './components/FeedbackStatCards';
import { FeedbackChartsRow } from './components/FeedbackChartsRow';
import { NeedsAttentionPanel } from './components/NeedsAttentionPanel';
import { FeedbackEntriesList } from './components/FeedbackEntries/FeedbackEntriesList';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { EmptyFeedbackState } from './components/EmptyFeedbackState';

export function AdminFeedbackPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const selectedPropertyId = searchParams.get('propertyId');
    const paramStartDate = searchParams.get('startDate');
    const paramEndDate = searchParams.get('endDate');
    const page = Number(searchParams.get('page') || '1');
    const sortBy = (searchParams.get('sortBy') as FeedbackSortField | null) || null;
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc' | null) || 'desc';

    // The DatePickerInput needs its own local state so partial selections are
    // visually committed during a fresh range pick. URL state only updates when
    // the range is complete (both dates) or fully cleared.
    const [pickerRange, setPickerRange] = useState<[Date | null, Date | null]>([
        paramStartDate ? dayjs(paramStartDate).toDate() : null,
        paramEndDate ? dayjs(paramEndDate).toDate() : null
    ]);

    // Keep picker in sync when URL changes from elsewhere (property switch,
    // browser back/forward, deep link). Compares by ISO string to avoid Date
    // identity churn on every render.
    useEffect(() => {
        const nextStart = paramStartDate ? dayjs(paramStartDate).format('YYYY-MM-DD') : null;
        const nextEnd = paramEndDate ? dayjs(paramEndDate).format('YYYY-MM-DD') : null;
        const currStart = pickerRange[0] ? dayjs(pickerRange[0]).format('YYYY-MM-DD') : null;
        const currEnd = pickerRange[1] ? dayjs(pickerRange[1]).format('YYYY-MM-DD') : null;
        if (nextStart !== currStart || nextEnd !== currEnd) {
            setPickerRange([
                paramStartDate ? dayjs(paramStartDate).toDate() : null,
                paramEndDate ? dayjs(paramEndDate).toDate() : null
            ]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramStartDate, paramEndDate]);

    // Cleared = all time (no date filtering)
    const startDate = paramStartDate ?? undefined;
    const endDate = paramEndDate ?? undefined;

    const propertiesQuery = useProperties();
    const properties = propertiesQuery.data?.data ?? [];

    const aggregationQuery = useFeedbackAggregation(
        selectedPropertyId,
        startDate,
        endDate,
        page,
        undefined,
        sortBy ?? undefined,
        sortOrder
    );
    const aggregation = aggregationQuery.data?.data;

    const handleSelectProperty = useCallback(
        (propertyId: string | null) => {
            setSearchParams(prev => {
                if (propertyId) {
                    prev.set('propertyId', propertyId);
                    if (!prev.has('startDate')) {
                        prev.set('startDate', dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
                        prev.set('endDate', dayjs().format('YYYY-MM-DD'));
                    }
                } else {
                    prev.delete('propertyId');
                    prev.delete('startDate');
                    prev.delete('endDate');
                }
                prev.delete('page');
                return prev;
            });
        },
        [setSearchParams]
    );

    const handleChangeDateRange = useCallback(
        (range: [Date | null, Date | null]) => {
            // Always update local picker state so partial selections are visible.
            setPickerRange(range);

            // Only sync to URL when the range is complete (both dates) or fully cleared.
            const hasPartialRange = (range[0] && !range[1]) || (!range[0] && range[1]);
            if (hasPartialRange) return;

            setSearchParams(prev => {
                if (range[0]) prev.set('startDate', dayjs(range[0]).format('YYYY-MM-DD'));
                else prev.delete('startDate');
                if (range[1]) prev.set('endDate', dayjs(range[1]).format('YYYY-MM-DD'));
                else prev.delete('endDate');
                prev.delete('page');
                return prev;
            });
        },
        [setSearchParams]
    );

    const handlePageChange = useCallback(
        (newPage: number) => {
            setSearchParams(prev => {
                prev.set('page', String(newPage));
                return prev;
            });
        },
        [setSearchParams]
    );

    const handleSortChange = useCallback(
        (nextSortBy: string | null, nextSortOrder: 'asc' | 'desc') => {
            setSearchParams(prev => {
                if (nextSortBy) {
                    prev.set('sortBy', nextSortBy);
                    prev.set('sortOrder', nextSortOrder);
                } else {
                    prev.delete('sortBy');
                    prev.delete('sortOrder');
                }
                // Changing sort resets to page 1, matching the date/property filter behavior.
                prev.delete('page');
                return prev;
            });
        },
        [setSearchParams]
    );

    if (!selectedPropertyId) {
        return (
            <PropertyPickerGrid
                properties={properties}
                isLoading={propertiesQuery.isLoading}
                onSelect={handleSelectProperty}
            />
        );
    }

    return (
        <Stack gap='lg'>
            <FeedbackHeader
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                onSelectProperty={handleSelectProperty}
                dateRange={pickerRange}
                onChangeDateRange={handleChangeDateRange}
                onBack={() => handleSelectProperty(null)}
            />

            {aggregationQuery.isLoading ? (
                <DashboardSkeleton />
            ) : aggregationQuery.isError ? (
                <Alert
                    color='red'
                    icon={<IconAlertTriangle size={18} />}
                    title='Failed to load feedback'
                    withCloseButton={false}
                >
                    <Group justify='space-between'>
                        <Text size='sm'>Something went wrong while loading the aggregation.</Text>
                        <Button size='xs' variant='light' onClick={() => aggregationQuery.refetch()}>
                            Retry
                        </Button>
                    </Group>
                </Alert>
            ) : aggregation && aggregation.totalCount === 0 ? (
                <EmptyFeedbackState
                    hasDateFilter={!!(paramStartDate || paramEndDate)}
                    onClearDateRange={() => handleChangeDateRange([null, null])}
                />
            ) : aggregation ? (
                <>
                    <NeedsAttentionPanel items={aggregation.needsAttention} />
                    <FeedbackStatCards aggregation={aggregation} />
                    <FeedbackChartsRow aggregation={aggregation} />
                    <FeedbackEntriesList
                        feedbacks={aggregation.feedbacks}
                        page={page}
                        totalPages={aggregation.totalPages}
                        onPageChange={handlePageChange}
                        totalFeedback={aggregation.totalCount}
                        sortControl={
                            <SortControl
                                options={[{ value: 'createdAt', label: 'Date' }]}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onChange={handleSortChange}
                                defaultSortBy='createdAt'
                            />
                        }
                    />
                </>
            ) : null}
        </Stack>
    );
}
