import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Alert, Button, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useProperties } from '@/hooks/api/use-properties';
import { useTicketStats } from '@/hooks/api/use-ticket-stats';
import { OverviewHeader } from './components/OverviewHeader';
import { OverviewSkeleton } from './components/OverviewSkeleton';
import { TicketStatCards } from './components/TicketStatCards';
import { TicketBreakdownCharts } from './components/TicketBreakdownCharts';
import { AssigneePerformanceTable } from './components/AssigneePerformanceTable';

export function AdminTicketsOverviewPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const propertyId = searchParams.get('propertyId');
    const paramStartDate = searchParams.get('startDate');
    const paramEndDate = searchParams.get('endDate');

    // Default resolution window — last 30 days.
    const defaultStart = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const defaultEnd = dayjs().format('YYYY-MM-DD');

    // `initialized` is true once the date window is settled: either the URL
    // already carried a range (deep link) or the default has been written below.
    // Gating the query on it avoids an initial unscoped "all time" fetch + flash
    // before the 30-day default commits to the URL. A later explicit clear (params
    // absent while initialized) still yields the intended all-time query.
    const [initialized, setInitialized] = useState(Boolean(paramStartDate || paramEndDate));

    // Default the date window on first load (URL stays the source of truth).
    useEffect(() => {
        if (!paramStartDate && !paramEndDate) {
            setSearchParams(
                prev => {
                    prev.set('startDate', defaultStart);
                    prev.set('endDate', defaultEnd);
                    return prev;
                },
                { replace: true }
            );
        }
        setInitialized(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [pickerRange, setPickerRange] = useState<[Date | null, Date | null]>([
        paramStartDate ? dayjs(paramStartDate).toDate() : null,
        paramEndDate ? dayjs(paramEndDate).toDate() : null
    ]);

    useEffect(() => {
        setPickerRange([
            paramStartDate ? dayjs(paramStartDate).toDate() : null,
            paramEndDate ? dayjs(paramEndDate).toDate() : null
        ]);
    }, [paramStartDate, paramEndDate]);

    const startDate = paramStartDate ?? undefined;
    const endDate = paramEndDate ?? undefined;

    const periodLabel =
        startDate && endDate ? `${dayjs(startDate).format('MMM D')} – ${dayjs(endDate).format('MMM D')}` : 'all time';

    const propertiesQuery = useProperties();
    const propertyOptions = (propertiesQuery.data?.data ?? []).map(p => ({ value: p.id, label: p.title }));

    const statsQuery = useTicketStats(startDate, endDate, propertyId ?? undefined, { enabled: initialized });
    const stats = statsQuery.data?.data;

    const handlePropertyChange = useCallback(
        (id: string | null) => {
            setSearchParams(prev => {
                if (id) prev.set('propertyId', id);
                else prev.delete('propertyId');
                return prev;
            });
        },
        [setSearchParams]
    );

    const handleRangeChange = useCallback(
        (range: [Date | null, Date | null]) => {
            setPickerRange(range);
            const [start, end] = range;
            // Only commit to URL when both ends chosen, or both cleared.
            if (start && end) {
                setSearchParams(prev => {
                    prev.set('startDate', dayjs(start).format('YYYY-MM-DD'));
                    prev.set('endDate', dayjs(end).format('YYYY-MM-DD'));
                    return prev;
                });
            } else if (!start && !end) {
                setSearchParams(prev => {
                    prev.delete('startDate');
                    prev.delete('endDate');
                    return prev;
                });
            }
        },
        [setSearchParams]
    );

    // "Clear all" → drop the property filter and restore the default 30-day window.
    // A *custom* range = both ends set and not the default window. Cleared dates
    // ("all time") is an intentional baseline, not a filter to clear — so it must
    // not surface the Clear affordance on its own.
    const isCustomRange =
        Boolean(paramStartDate && paramEndDate) && !(paramStartDate === defaultStart && paramEndDate === defaultEnd);
    const showClear = propertyId !== null || isCustomRange;

    const handleClear = useCallback(() => {
        setSearchParams(prev => {
            prev.delete('propertyId');
            prev.set('startDate', defaultStart);
            prev.set('endDate', defaultEnd);
            return prev;
        });
    }, [setSearchParams, defaultStart, defaultEnd]);

    return (
        <Stack gap='md'>
            <OverviewHeader
                properties={propertyOptions}
                propertyId={propertyId}
                onPropertyChange={handlePropertyChange}
                range={pickerRange}
                onRangeChange={handleRangeChange}
                showClear={showClear}
                onClear={handleClear}
            />

            {!initialized || statsQuery.isLoading ? (
                <OverviewSkeleton />
            ) : statsQuery.isError ? (
                <Alert color='red' icon={<IconAlertTriangle size={16} />} title='Could not load ticket stats'>
                    <Button mt='sm' size='xs' variant='light' onClick={() => statsQuery.refetch()}>
                        Retry
                    </Button>
                </Alert>
            ) : stats ? (
                <>
                    <TicketStatCards stats={stats} periodLabel={periodLabel} />
                    <TicketBreakdownCharts stats={stats} />
                    <AssigneePerformanceTable rows={stats.byAssignee} />
                </>
            ) : null}
        </Stack>
    );
}
