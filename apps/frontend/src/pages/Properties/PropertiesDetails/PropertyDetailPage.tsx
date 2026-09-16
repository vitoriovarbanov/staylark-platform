import { useProperty, usePropertyAvailability } from '@/hooks/api/use-properties';
import { usePricingQuote } from '@/hooks/pricing/use-pricing-quote';
import {
    Anchor,
    Badge,
    Box,
    Breadcrumbs,
    Container,
    Group,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    Title
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronRight, IconMapPin } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar/AvailabilityCalendar';
import { BookingConfirmationModal } from '../components/BookingConfirmationModal/BookingConfirmationModal';
import { BookingSidebar } from '../components/BookingSidebar/BookingSidebar';
import { PhotoCarousel } from '../components/PhotoCarousel/PhotoCarousel';
import classes from './PropertyDetailPage.module.css';

export function PropertyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data, isLoading } = useProperty(id!);
    const { data: bookedDates } = usePropertyAvailability(id!);
    const property = data?.data;

    const [guests, setGuests] = useState(1);
    const [confirmModalOpened, { open: openConfirmModal, close: closeConfirmModal }] = useDisclosure(false);

    // Read dates from URL
    const checkInStr = searchParams.get('checkIn') ?? '';
    const checkOutStr = searchParams.get('checkOut') ?? '';
    const checkIn = checkInStr ? dayjs(checkInStr).toDate() : null;
    const checkOut = checkOutStr ? dayjs(checkOutStr).toDate() : null;
    const nights = checkIn && checkOut ? dayjs(checkOut).diff(dayjs(checkIn), 'day') : 0;
    const mode = searchParams.get('mode') === 'monthly' ? 'monthly' : 'nightly';
    // Clamp to an integer 1–12 — the URL is the source of truth, so a hand-edited
    // or stale `months` must never derive an over-cap (or fractional) stay.
    const months = Math.min(12, Math.max(1, Math.trunc(Number(searchParams.get('months'))) || 1));

    const {
        data: quote,
        isLoading: isQuoteLoading,
        isError: isQuoteError
    } = usePricingQuote(id!, checkInStr || null, checkOutStr || null);

    const setParams = (mutate: (p: URLSearchParams) => void) =>
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            mutate(next);
            return next;
        });

    const deriveCheckOut = (ci: string, m: number) => dayjs(ci).add(m, 'month').format('YYYY-MM-DD');

    const handleModeChange = (next: string) => {
        setParams(p => {
            p.set('mode', next);
            if (next === 'monthly' && checkInStr) {
                p.set('months', String(months));
                p.set('checkOut', deriveCheckOut(checkInStr, months));
            }
        });
    };

    const handleCheckInChange = (date: Date | null) => {
        setParams(p => {
            if (!date) {
                p.delete('checkIn');
                if (mode === 'monthly') p.delete('checkOut');
                return;
            }
            const ci = dayjs(date).format('YYYY-MM-DD');
            p.set('checkIn', ci);
            if (mode === 'monthly') p.set('checkOut', deriveCheckOut(ci, months));
        });
    };

    const handleCheckOutChange = (date: Date | null) => {
        setParams(p => {
            if (date) p.set('checkOut', dayjs(date).format('YYYY-MM-DD'));
            else p.delete('checkOut');
        });
    };

    const handleMonthsChange = (m: number) => {
        setParams(p => {
            p.set('months', String(m));
            if (checkInStr) p.set('checkOut', deriveCheckOut(checkInStr, m));
        });
    };

    // In monthly mode the checkout is always check-in + months. Enforce that
    // invariant on load too (direct/bookmarked links, or a stale checkOut that
    // contradicts months), not only on user interaction. Idempotent: no-ops once
    // checkOut already matches, so it can't loop. `replace` keeps history clean.
    useEffect(() => {
        if (mode !== 'monthly' || !checkInStr) return;
        const derived = dayjs(checkInStr).add(months, 'month').format('YYYY-MM-DD');
        if (checkOutStr !== derived) {
            setSearchParams(
                prev => {
                    const next = new URLSearchParams(prev);
                    next.set('checkOut', derived);
                    return next;
                },
                { replace: true }
            );
        }
    }, [mode, checkInStr, months, checkOutStr, setSearchParams]);

    const excludeDate = useCallback(
        (date: Date) => {
            if (!bookedDates) return false;
            return bookedDates.has(dayjs(date).format('YYYY-MM-DD'));
        },
        [bookedDates]
    );

    // Check if selected range overlaps with any booked dates
    const hasBookedOverlap = useMemo(() => {
        if (!checkIn || !checkOut || !bookedDates) return false;
        let current = dayjs(checkIn);
        const end = dayjs(checkOut);
        while (current.isBefore(end)) {
            if (bookedDates.has(current.format('YYYY-MM-DD'))) return true;
            current = current.add(1, 'day');
        }
        return false;
    }, [checkIn, checkOut, bookedDates]);

    if (isLoading) {
        return (
            <Container size='xl' py='md'>
                <Stack gap='lg'>
                    <Skeleton height={400} radius='lg' />
                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing='lg'>
                        <Stack gap='md' className={classes.mainColumn}>
                            <Skeleton height={32} width='60%' />
                            <Skeleton height={20} width='30%' />
                            <Skeleton height={100} />
                        </Stack>
                        <Skeleton height={300} radius='md' />
                    </SimpleGrid>
                </Stack>
            </Container>
        );
    }

    if (!property) {
        return (
            <Container size='xl' py='xl'>
                <Stack align='center'>
                    <Title order={3}>Property not found</Title>
                    <Text c='dimmed'>This property may have been removed or doesn&apos;t exist.</Text>
                </Stack>
            </Container>
        );
    }

    return (
        <Container size='xl' py='md'>
            <Stack gap='lg'>
                <Breadcrumbs
                    separator={<IconChevronRight size={14} stroke={1.5} color='var(--mantine-other-text-secondary)' />}
                >
                    <Anchor component={Link} to='/' size='sm' c='dimmed'>
                        Home
                    </Anchor>
                    <Anchor component={Link} to='/properties' size='sm' c='dimmed'>
                        Properties
                    </Anchor>
                    <Text size='sm' fw={500} lineClamp={1}>
                        {property.title}
                    </Text>
                </Breadcrumbs>

                <PhotoCarousel photos={property.photos} title={property.title} />

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing='lg'>
                    {/* Left: property info (2/3 width) */}
                    <Stack gap='md' className={classes.mainColumn}>
                        <div>
                            <Group gap='sm' mb='xs'>
                                <Badge variant='light'>{property.type}</Badge>
                                <Group gap={4}>
                                    <IconMapPin size={16} stroke={1.5} color='var(--mantine-other-text-secondary)' />
                                    <Text size='sm' c='dimmed'>
                                        {property.city}
                                    </Text>
                                </Group>
                            </Group>
                            <Title order={2}>{property.title}</Title>
                            <Text size='sm' c='dimmed' mt={4}>
                                {property.address}
                            </Text>
                        </div>

                        <div>
                            <Title order={4} mb='xs'>
                                About this property
                            </Title>
                            <Text style={{ whiteSpace: 'pre-line' }}>{property.description}</Text>
                        </div>

                        {/* Amenities as styled badges */}
                        {property.amenities.length > 0 && (
                            <div>
                                <Title order={4} mb='sm'>
                                    Amenities
                                </Title>
                                <Group gap='xs'>
                                    {property.amenities.map(a => (
                                        <Badge key={a} size='lg' variant='outline' className={classes.amenityBadge}>
                                            {a.replace(/-/g, ' ')}
                                        </Badge>
                                    ))}
                                </Group>
                            </div>
                        )}

                        {/* Availability calendar with styled section */}
                        <Box className={classes.availabilitySection}>
                            <AvailabilityCalendar checkIn={checkIn} checkOut={checkOut} excludeDate={excludeDate} />
                        </Box>
                    </Stack>

                    {/* Right: booking sidebar (1/3 width) */}
                    <div>
                        <BookingSidebar
                            nightlyPrice={property.nightlyPrice}
                            checkIn={checkIn}
                            checkOut={checkOut}
                            nights={nights}
                            guests={guests}
                            maxGuests={property.maxGuests}
                            mode={mode}
                            months={months}
                            onModeChange={handleModeChange}
                            onMonthsChange={handleMonthsChange}
                            onCheckInChange={handleCheckInChange}
                            onCheckOutChange={handleCheckOutChange}
                            onGuestsChange={setGuests}
                            onBookNow={openConfirmModal}
                            excludeDate={excludeDate}
                            hasOverlap={hasBookedOverlap}
                            quote={quote}
                            isQuoteLoading={isQuoteLoading}
                            isQuoteError={isQuoteError}
                        />
                    </div>
                </SimpleGrid>
            </Stack>

            {checkIn && checkOut && (
                <BookingConfirmationModal
                    opened={confirmModalOpened}
                    onClose={closeConfirmModal}
                    propertyTitle={property.title}
                    propertyPhoto={property.photos[0]}
                    nightlyPrice={property.nightlyPrice}
                    checkIn={dayjs(checkIn).format('YYYY-MM-DD')}
                    checkOut={dayjs(checkOut).format('YYYY-MM-DD')}
                    nights={nights}
                    guests={guests}
                    propertyId={property.id}
                    quote={quote}
                    isQuoteLoading={isQuoteLoading}
                    isQuoteError={isQuoteError}
                    mode={mode}
                />
            )}
        </Container>
    );
}
