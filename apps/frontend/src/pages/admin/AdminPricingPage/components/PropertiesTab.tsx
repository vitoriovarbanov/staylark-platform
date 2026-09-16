import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
    Badge,
    Button,
    Center,
    Group,
    NumberInput,
    Pagination,
    Stack,
    Text,
    Tooltip,
    UnstyledButton
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { filterBarClasses } from '@/components/FilterBar/FilterBar';
import {
    IconArrowDown,
    IconArrowUp,
    IconArrowsSort,
    IconBuildingOff,
    IconInfoCircle,
    IconRefresh,
    IconTrendingDown,
    IconTrendingUp
} from '@tabler/icons-react';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import dayjs from 'dayjs';
import {
    PropertySortField,
    PropertySortOrder,
    PropertyTypeEnum,
    type PaginatedResponse,
    type Property,
    type PropertyFilter,
    type PropertySortFieldValue,
    type PropertySortOrderValue,
    type PropertyType
} from '@staylark/contract';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef } from '@/components/DataTable/types';
import { useProperties, useCities } from '@/hooks/api/use-properties';
import { useUpdatePropertyBounds } from '@/hooks/admin-pricing/use-update-property-bounds';
import { usePropertyQuotes } from '@/hooks/admin-pricing/use-property-quotes';
import { PropertiesFilterBar } from './PropertiesFilterBar';

const PAGE_LIMIT = 20;

/** Returns YYYY-MM-DD for the next Saturday (or today if today is Saturday). */
function nextSaturdayDate(): string {
    const today = dayjs();
    const dayOfWeek = today.day(); // 0=Sun, 6=Sat
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    return today.add(daysUntilSaturday, 'day').format('YYYY-MM-DD');
}

function isIsoDate(value: string | null): value is string {
    return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

interface SortHeaderProps {
    label: string;
    field: PropertySortFieldValue;
    activeSort: PropertySortFieldValue;
    activeOrder: PropertySortOrderValue;
    onSort: (field: PropertySortFieldValue) => void;
}

function SortHeader({ label, field, activeSort, activeOrder, onSort }: SortHeaderProps) {
    const isActive = activeSort === field;
    const Icon = !isActive ? IconArrowsSort : activeOrder === 'asc' ? IconArrowUp : IconArrowDown;
    return (
        <UnstyledButton
            onClick={() => onSort(field)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 'inherit' }}
        >
            <span>{label}</span>
            <Icon size={12} opacity={isActive ? 1 : 0.4} />
        </UnstyledButton>
    );
}

interface BoundsCellProps {
    propertyId: string;
    field: 'minNightlyPrice' | 'maxNightlyPrice';
    value: number | null | undefined;
    basePrice: number;
    siblingValue: number | null | undefined;
    onSave: (field: 'minNightlyPrice' | 'maxNightlyPrice', value: number | null) => void;
    isPending: boolean;
}

function BoundsCell({ propertyId, field, value, basePrice, siblingValue, onSave, isPending }: BoundsCellProps) {
    const [draft, setDraft] = useState<number | ''>(value ?? '');

    const commit = () => {
        const next = draft === '' ? null : Number(draft);
        if (next === (value ?? null)) return;

        if (next !== null) {
            if (field === 'minNightlyPrice') {
                if (next > basePrice) {
                    notifications.show({ color: 'red', message: 'Min cannot exceed base price.' });
                    setDraft(value ?? '');
                    return;
                }
                if (siblingValue != null && next > siblingValue) {
                    notifications.show({ color: 'red', message: 'Min cannot exceed max.' });
                    setDraft(value ?? '');
                    return;
                }
            } else {
                if (next < basePrice) {
                    notifications.show({ color: 'red', message: 'Max cannot be below base price.' });
                    setDraft(value ?? '');
                    return;
                }
                if (siblingValue != null && next < siblingValue) {
                    notifications.show({ color: 'red', message: 'Max cannot be below min.' });
                    setDraft(value ?? '');
                    return;
                }
            }
        }

        onSave(field, next);
    };

    return (
        <NumberInput
            value={draft}
            onChange={v => setDraft(v as number | '')}
            onBlur={commit}
            onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            prefix='€ '
            min={1}
            decimalScale={2}
            disabled={isPending}
            hideControls
            w={110}
            aria-label={`${field} for property ${propertyId}`}
        />
    );
}

export function PropertiesTab() {
    const [searchParams, setSearchParams] = useSearchParams();

    const city = searchParams.get('city');
    const type: PropertyType | null = PropertyTypeEnum.safeParse(searchParams.get('type')).data ?? null;
    const sort: PropertySortFieldValue = PropertySortField.safeParse(searchParams.get('sort')).data ?? 'createdAt';
    const order: PropertySortOrderValue = PropertySortOrder.safeParse(searchParams.get('order')).data ?? 'desc';
    const page = Number(searchParams.get('propertiesPage') ?? '1');
    const paramSampleDate = searchParams.get('sampleDate');
    const sampleDate = isIsoDate(paramSampleDate) ? paramSampleDate : nextSaturdayDate();

    const filters: PropertyFilter = useMemo(
        () => ({
            ...(city && { city }),
            ...(type && { type }),
            sort,
            order,
            page,
            limit: PAGE_LIMIT
        }),
        [city, type, sort, order, page]
    );

    const propertiesQuery = useProperties(filters);
    const properties: Property[] = useMemo(() => propertiesQuery.data?.data ?? [], [propertiesQuery.data]);
    const total = (propertiesQuery.data as PaginatedResponse<Property> | undefined)?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

    const citiesQuery = useCities();
    const cities = citiesQuery.data?.data ?? [];

    const boundsMutation = useUpdatePropertyBounds();

    const [quotesEnabled, setQuotesEnabled] = useState(false);
    const propertyIds = useMemo(() => properties.map(p => p.id), [properties]);
    const quoteResults = usePropertyQuotes(propertyIds, sampleDate, quotesEnabled);

    const quoteResultsById = useMemo(() => {
        const map = new Map<string, (typeof quoteResults)[number]>();
        propertyIds.forEach((id, idx) => map.set(id, quoteResults[idx]));
        return map;
    }, [propertyIds, quoteResults]);

    // Cached quotes survive tab/page unmount via Tanstack's query cache, so cells
    // render from `result.data` directly — independent of the local quotesEnabled
    // flag, which only governs whether to auto-fire fetches.
    const { hasAnyCached, isQuoting, loadedCount } = useMemo(() => {
        let cached = 0;
        let fetching = false;
        for (const r of quoteResults) {
            if (r.data !== undefined) cached++;
            if (r.isFetching) fetching = true;
        }
        return { hasAnyCached: cached > 0, isQuoting: fetching, loadedCount: cached };
    }, [quoteResults]);

    const updateParam = useCallback(
        (key: string, value: string | null, resetPage = true) => {
            const next = new URLSearchParams(searchParams);
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
            if (resetPage) next.set('propertiesPage', '1');
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    const handlePageChange = (next: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('propertiesPage', String(next));
        setSearchParams(params, { replace: true });
    };

    const handleSort = (field: PropertySortFieldValue) => {
        const params = new URLSearchParams(searchParams);
        if (sort === field) {
            params.set('order', order === 'asc' ? 'desc' : 'asc');
        } else {
            params.set('sort', field);
            params.set('order', 'asc');
        }
        params.set('propertiesPage', '1');
        setSearchParams(params, { replace: true });
    };

    const handleSaveBound = (
        property: Property,
        field: 'minNightlyPrice' | 'maxNightlyPrice',
        value: number | null
    ) => {
        boundsMutation.mutate(
            { id: property.id, patch: { [field]: value } },
            {
                onError: (err: unknown) => {
                    const message = (err as { message?: string })?.message ?? 'Failed to update bounds.';
                    notifications.show({ color: 'red', message });
                }
            }
        );
    };

    const handleRefreshQuotes = () => {
        if (!quotesEnabled) {
            setQuotesEnabled(true);
            return;
        }
        quoteResults.forEach(r => r.refetch());
    };

    const buttonLabel = isQuoting
        ? `Loading ${loadedCount}/${propertyIds.length}`
        : hasAnyCached
          ? 'Refresh quotes'
          : 'Load quotes';

    const handleSampleDateChange = (value: Date | string | null) => {
        if (!value) return;
        const iso = dayjs(value).format('YYYY-MM-DD');
        updateParam('sampleDate', iso, false);
    };

    const sampleDateControls = (
        <Group gap='sm' wrap='nowrap' ml='auto'>
            <DatePickerInput
                value={dayjs(sampleDate).toDate()}
                onChange={handleSampleDateChange}
                valueFormat='ddd D MMM YYYY'
                minDate={dayjs().toDate()}
                size='xs'
                w={180}
                miw={0}
                aria-label='Sample night for quotes'
                classNames={{ root: filterBarClasses.field, input: filterBarClasses.input }}
                popoverProps={{ withinPortal: true, zIndex: 200 }}
            />
            <Button
                leftSection={<IconRefresh size={14} />}
                variant='light'
                size='xs'
                onClick={handleRefreshQuotes}
                loading={isQuoting}
            >
                {buttonLabel}
            </Button>
        </Group>
    );

    const columns: ColumnDef<Property>[] = useMemo(
        () => [
            {
                key: 'title',
                header: (
                    <SortHeader
                        label='Property'
                        field='title'
                        activeSort={sort}
                        activeOrder={order}
                        onSort={handleSort}
                    />
                ),
                render: row => (
                    <Stack gap={0}>
                        <Text
                            component='a'
                            href={`/properties/${row.id}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            fw={500}
                            c='blue'
                            size='sm'
                        >
                            {row.title}
                        </Text>
                    </Stack>
                )
            },
            {
                key: 'city',
                header: (
                    <SortHeader label='City' field='city' activeSort={sort} activeOrder={order} onSort={handleSort} />
                ),
                render: row => <Text size='sm'>{row.city}</Text>
            },
            {
                key: 'basePrice',
                header: (
                    <SortHeader
                        label='Base'
                        field='basePrice'
                        activeSort={sort}
                        activeOrder={order}
                        onSort={handleSort}
                    />
                ),
                align: 'right',
                render: row => <Text size='sm'>€{row.nightlyPrice.toFixed(2)}</Text>
            },
            {
                key: 'min',
                header: 'Min',
                width: 140,
                render: row => (
                    <BoundsCell
                        propertyId={row.id}
                        field='minNightlyPrice'
                        value={row.minNightlyPrice}
                        basePrice={row.nightlyPrice}
                        siblingValue={row.maxNightlyPrice}
                        onSave={(field, value) => handleSaveBound(row, field, value)}
                        isPending={boundsMutation.isPending}
                    />
                )
            },
            {
                key: 'max',
                header: 'Max',
                width: 140,
                render: row => (
                    <BoundsCell
                        propertyId={row.id}
                        field='maxNightlyPrice'
                        value={row.maxNightlyPrice}
                        basePrice={row.nightlyPrice}
                        siblingValue={row.minNightlyPrice}
                        onSave={(field, value) => handleSaveBound(row, field, value)}
                        isPending={boundsMutation.isPending}
                    />
                )
            },
            {
                key: 'quote',
                header: (
                    <Stack gap={0} align='flex-end'>
                        <Text size='sm' fw={600}>
                            1-night quote
                        </Text>
                        <Group gap={4} wrap='nowrap'>
                            <Text size='xs' c='dimmed' fw={400}>
                                {dayjs(sampleDate).format('ddd D MMM YYYY')}
                            </Text>
                            <Tooltip
                                multiline
                                w={280}
                                label='Dynamic price the engine would quote a guest for a 1-night stay starting on this date. Includes the current ML model and any active overrides, clamped to each property’s min/max bounds. Pick a different date above to investigate other windows.'
                            >
                                <IconInfoCircle
                                    size={12}
                                    style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)' }}
                                />
                            </Tooltip>
                        </Group>
                    </Stack>
                ),
                align: 'right',
                render: row => {
                    const result = quoteResultsById.get(row.id);
                    if (result?.data) {
                        const overrideNames = (result.data.breakdown[0]?.appliedRules ?? []).filter(
                            r => r !== 'ML model'
                        );
                        const hasOverrides = overrideNames.length > 0;
                        const total = result.data.totalPrice;
                        const base = result.data.basePrice;
                        const trend = hasOverrides ? (total > base ? 'up' : total < base ? 'down' : null) : null;
                        const color = trend === 'up' ? 'green' : trend === 'down' ? 'red' : undefined;
                        const TrendIcon = trend === 'up' ? IconTrendingUp : trend === 'down' ? IconTrendingDown : null;
                        const priceContent = (
                            <Group gap={4} wrap='nowrap' justify='flex-end'>
                                <Text size='sm' fw={500} c={color}>
                                    €{total.toFixed(2)}
                                </Text>
                                {TrendIcon && <TrendIcon size={14} color={`var(--mantine-color-${color}-6)`} />}
                            </Group>
                        );
                        if (!hasOverrides) return priceContent;
                        return (
                            <Tooltip multiline w={240} label={`Active overrides applied: ${overrideNames.join(', ')}`}>
                                <span style={{ cursor: 'help' }}>{priceContent}</span>
                            </Tooltip>
                        );
                    }
                    if (result?.isFetching)
                        return (
                            <Text size='sm' c='dimmed'>
                                …
                            </Text>
                        );
                    if (result?.isError) {
                        return (
                            <Badge color='red' variant='light'>
                                err
                            </Badge>
                        );
                    }
                    return (
                        <Text size='sm' c='dimmed'>
                            —
                        </Text>
                    );
                }
            }
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sort, order, sampleDate, quoteResultsById, boundsMutation.isPending]
    );

    return (
        <Stack gap='md'>
            <PropertiesFilterBar
                cities={cities}
                city={city}
                type={type}
                onChangeCity={value => updateParam('city', value)}
                onChangeType={value => updateParam('type', value)}
                rightSection={sampleDateControls}
            />

            <DataTable
                data={properties}
                columns={columns}
                isLoading={propertiesQuery.isLoading}
                getRowKey={row => row.id}
                emptyState={
                    <EmptyState
                        variant='compact'
                        icon={IconBuildingOff}
                        title='No properties match these filters'
                        body='Adjust the filters or create a property in the Properties admin.'
                    />
                }
            />

            <Group justify='space-between'>
                <Text size='xs' c='dimmed'>
                    {hasAnyCached && !isQuoting && `${loadedCount}/${propertyIds.length} quotes cached`}
                </Text>
                {totalPages > 1 && (
                    <Center style={{ marginLeft: 'auto' }}>
                        <Pagination value={page} onChange={handlePageChange} total={totalPages} />
                    </Center>
                )}
            </Group>
        </Stack>
    );
}
