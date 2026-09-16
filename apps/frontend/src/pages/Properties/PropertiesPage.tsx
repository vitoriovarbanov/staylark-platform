import { useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router';
import { Container, SimpleGrid, Text, Group, Stack, Pagination, Breadcrumbs, Anchor } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useProperties, usePropertiesRangeAvailability } from '@/hooks/api/use-properties';
import type { PropertyFilter, PropertyType } from '@staylark/contract';
import { IconHomeSearch } from '@tabler/icons-react';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { PropertyFilterBar, PRICE_RANGE } from './components/PropertyFilterBar/PropertyFilterBar';
import { PropertyCard, PropertyCardSkeleton } from './components/PropertyCard/PropertyCard';
import classes from './PropertiesPage.module.css';

export function PropertiesPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Read filter state from URL
    const urlCity = searchParams.get('city') ?? '';
    const urlType = (searchParams.get('type') ?? '') as PropertyType | '';
    const urlMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : PRICE_RANGE[0];
    const urlMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : PRICE_RANGE[1];
    const urlAmenities = searchParams.get('amenities')?.split(',').filter(Boolean) ?? [];
    const urlPage = Number(searchParams.get('page')) || 1;
    const urlCheckIn = searchParams.get('checkIn') ?? '';
    const urlCheckOut = searchParams.get('checkOut') ?? '';
    const urlSort = searchParams.get('sort') ?? '';

    // Build filter object for the API call
    const filters: PropertyFilter = {
        page: urlPage,
        limit: 12,
        ...(urlCity && { city: urlCity }),
        ...(urlType && { type: urlType as PropertyType }),
        ...(urlMinPrice > PRICE_RANGE[0] && { minPrice: urlMinPrice }),
        ...(urlMaxPrice < PRICE_RANGE[1] && { maxPrice: urlMaxPrice }),
        ...(urlAmenities.length > 0 && { amenities: urlAmenities })
    };

    const { data, isLoading } = useProperties(filters);
    const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

    // Listing shows an indicative per-night "from" price only. The exact stay
    // total is computed by the pricing engine on the detail page (dynamic rules,
    // overrides, occupancy, last-minute & duration discounts), so showing a flat
    // `nightlyPrice * nights` total here would contradict it. See
    // PropertyDetailPage / usePricingQuote for the authoritative quote.
    const formatPrice = (nightlyPrice: number) => `from €${nightlyPrice}/night`;

    // Client-side sort (API may not support sort param)
    const properties = data?.data;
    const sortedProperties = useMemo(() => {
        if (!properties) return [];
        const items = [...properties];
        switch (urlSort) {
            case 'price_asc':
                return items.sort((a, b) => a.nightlyPrice - b.nightlyPrice);
            case 'price_desc':
                return items.sort((a, b) => b.nightlyPrice - a.nightlyPrice);
            case 'newest':
                return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            default:
                return items;
        }
    }, [properties, urlSort]);

    // When the search carries a date range, annotate cards that are booked for it.
    const listedIds = useMemo(() => sortedProperties.map(p => p.id), [sortedProperties]);
    const { data: rangeAvailability } = usePropertiesRangeAvailability(listedIds, urlCheckIn, urlCheckOut);

    // Build link to detail page, carrying dates forward
    const detailLink = (propertyId: string) => {
        const params = new URLSearchParams();
        if (urlCheckIn) params.set('checkIn', urlCheckIn);
        if (urlCheckOut) params.set('checkOut', urlCheckOut);
        const qs = params.toString();
        return `/properties/${propertyId}${qs ? `?${qs}` : ''}`;
    };

    // Update URL params (used by filter bar and pagination)
    const updateParams = useCallback(
        (updates: Record<string, string | undefined>) => {
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                for (const [key, val] of Object.entries(updates)) {
                    if (val === undefined || val === '') {
                        next.delete(key);
                    } else {
                        next.set(key, val);
                    }
                }
                // Reset to page 1 when filters change (unless page itself is being set)
                if (!('page' in updates)) {
                    next.delete('page');
                }
                return next;
            });
        },
        [setSearchParams]
    );

    return (
        <Container size='xl' py='sm'>
            <Stack gap='md'>
                <Breadcrumbs
                    separator={<IconChevronRight size={14} stroke={1.5} color='var(--mantine-other-text-secondary)' />}
                >
                    <Anchor component={Link} to='/' size='sm' c='dimmed'>
                        Home
                    </Anchor>
                    <Text size='sm' fw={500}>
                        Properties
                    </Text>
                </Breadcrumbs>

                <PropertyFilterBar searchParams={searchParams} onUpdateParams={updateParams} />

                {/* Results count */}
                {!isLoading && data && (
                    <Text className={classes.resultsCount}>
                        {data.total} {data.total === 1 ? 'RESULT' : 'RESULTS'}
                    </Text>
                )}

                {/* Property grid */}
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing='md'>
                    {isLoading
                        ? Array.from({ length: 6 }).map((_, i) => <PropertyCardSkeleton key={i} />)
                        : sortedProperties.map((property, index) => {
                              const availability = rangeAvailability?.[property.id];
                              return (
                                  <PropertyCard
                                      key={property.id}
                                      property={property}
                                      href={detailLink(property.id)}
                                      priceLabel={formatPrice(property.nightlyPrice)}
                                      index={index}
                                      blockedRanges={
                                          availability && !availability.available
                                              ? availability.blockedRanges
                                              : undefined
                                      }
                                  />
                              );
                          })}
                </SimpleGrid>

                {/* Empty state */}
                {!isLoading && data?.data.length === 0 && (
                    <EmptyState
                        icon={IconHomeSearch}
                        eyebrow='NO MATCHES'
                        title='No properties found'
                        body='Try adjusting your filters or search for a different city.'
                    />
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <Group justify='center'>
                        <Pagination
                            total={totalPages}
                            value={urlPage}
                            onChange={p => updateParams({ page: p > 1 ? String(p) : undefined })}
                        />
                    </Group>
                )}
            </Stack>
        </Container>
    );
}
