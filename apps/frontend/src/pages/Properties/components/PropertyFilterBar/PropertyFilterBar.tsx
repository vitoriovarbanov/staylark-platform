import { Button, Stack } from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import type { PropertyType } from '@staylark/contract';
import { IconAdjustments, IconSearch, IconSortAscending } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { FilterBar } from '@/components/FilterBar/FilterBar';
import { ActiveFilterPills } from './ActiveFilterPills';
import { FilterDrawer } from './FilterDrawer';
import classes from './PropertyFilterBar.module.css';

const PROPERTY_TYPES: { value: string; label: string }[] = [
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'HOUSE', label: 'House' },
    { value: 'HOTEL', label: 'Hotel' }
];

const SORT_OPTIONS: { value: string; label: string }[] = [
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest' }
];

const PRICE_RANGE: [number, number] = [0, 500];

interface PropertyFilterBarProps {
    searchParams: URLSearchParams;
    onUpdateParams: (updates: Record<string, string | undefined>) => void;
}

export { PRICE_RANGE };

export function PropertyFilterBar({ searchParams, onUpdateParams }: PropertyFilterBarProps) {
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

    // ── Read URL params ──
    const urlCity = searchParams.get('city') ?? '';
    const urlType = (searchParams.get('type') ?? '') as PropertyType | '';
    const urlMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : PRICE_RANGE[0];
    const urlMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : PRICE_RANGE[1];
    const urlCheckIn = searchParams.get('checkIn') ?? '';
    const urlCheckOut = searchParams.get('checkOut') ?? '';
    const urlSort = searchParams.get('sort') ?? '';

    // Memoize amenities array to avoid new reference on every render
    const amenitiesParam = searchParams.get('amenities');
    const urlAmenities = useMemo(() => amenitiesParam?.split(',').filter(Boolean) ?? [], [amenitiesParam]);

    const checkInDate = urlCheckIn ? dayjs(urlCheckIn).toDate() : null;
    const checkOutDate = urlCheckOut ? dayjs(urlCheckOut).toDate() : null;

    // ── Local state for debounced city ──
    const [city, setCity] = useState(urlCity);
    const [debouncedCity] = useDebouncedValue(city, 300);

    useEffect(() => {
        setCity(urlCity);
    }, [urlCity]);

    useEffect(() => {
        if (debouncedCity !== urlCity) {
            onUpdateParams({ city: debouncedCity || undefined });
        }
    }, [debouncedCity]); // eslint-disable-line react-hooks/exhaustive-deps

    const priceActive = urlMinPrice > PRICE_RANGE[0] || urlMaxPrice < PRICE_RANGE[1];

    // Count only what lives in the drawer (price + amenities) — the rest is inline.
    const drawerFilterCount = useMemo(() => (priceActive ? 1 : 0) + urlAmenities.length, [priceActive, urlAmenities]);

    const anyFilterActive =
        Boolean(urlCity || urlType || urlCheckIn || urlCheckOut) || priceActive || urlAmenities.length > 0;

    function handleClearAll() {
        setCity('');
        onUpdateParams({
            city: undefined,
            type: undefined,
            checkIn: undefined,
            checkOut: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            amenities: undefined
        });
    }

    return (
        <>
            <Stack gap='sm'>
                <FilterBar>
                    <FilterBar.TextInput
                        placeholder='Search by city...'
                        leftSection={<IconSearch size={16} />}
                        value={city}
                        onChange={e => setCity(e.currentTarget.value)}
                        style={{ flexGrow: 1, flexBasis: 200 }}
                    />

                    <FilterBar.Select
                        placeholder='All types'
                        data={PROPERTY_TYPES}
                        value={urlType || null}
                        onChange={val => onUpdateParams({ type: val || undefined })}
                        clearable
                        miw={150}
                    />

                    <FilterBar.DateRange
                        placeholder='Check-in — Check-out'
                        value={[checkInDate, checkOutDate]}
                        onChange={([start, end]) =>
                            onUpdateParams({
                                checkIn: start ? dayjs(start).format('YYYY-MM-DD') : undefined,
                                checkOut: end ? dayjs(end).format('YYYY-MM-DD') : undefined
                            })
                        }
                        minDate={new Date()}
                        clearable
                        miw={240}
                    />

                    <FilterBar.Select
                        placeholder='Sort by'
                        data={SORT_OPTIONS}
                        value={urlSort || null}
                        onChange={val => onUpdateParams({ sort: val || undefined })}
                        leftSection={<IconSortAscending size={16} />}
                        clearable
                        miw={170}
                    />

                    <span className={classes.filterButton}>
                        <Button variant='default' leftSection={<IconAdjustments size={16} />} onClick={openDrawer}>
                            More filters
                        </Button>
                        {drawerFilterCount > 0 && <span className={classes.filterBadge}>{drawerFilterCount}</span>}
                    </span>

                    <FilterBar.Clear show={anyFilterActive} onClick={handleClearAll} />
                </FilterBar>

                <ActiveFilterPills
                    urlCheckIn={urlCheckIn}
                    urlCheckOut={urlCheckOut}
                    urlType={urlType}
                    urlMinPrice={urlMinPrice}
                    urlMaxPrice={urlMaxPrice}
                    urlAmenities={urlAmenities}
                    propertyTypes={PROPERTY_TYPES}
                    priceRange={PRICE_RANGE}
                    onUpdateParams={onUpdateParams}
                />
            </Stack>

            <FilterDrawer
                opened={drawerOpened}
                onClose={closeDrawer}
                urlMinPrice={urlMinPrice}
                urlMaxPrice={urlMaxPrice}
                urlAmenities={urlAmenities}
                drawerFilterCount={drawerFilterCount}
                priceRange={PRICE_RANGE}
                onUpdateParams={onUpdateParams}
            />
        </>
    );
}
