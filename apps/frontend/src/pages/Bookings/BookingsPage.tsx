import { Link } from 'react-router';
import { Anchor, Breadcrumbs, Container, Skeleton, Stack, Text } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useBookings, type BookingWithRelations } from '@/hooks/api/use-bookings';
import { partitionBookings, pickHero } from './utils/bookings.utils';
import { NextDepartureHero } from './components/BookingsOverview/NextDepartureHero';
import { BookingSection } from './components/BookingSection/BookingSection';
import { EmptyBookings } from './components/EmptyBookings';
import { MoreJourneysPromo } from './components/MoreJourneysPromo/MoreJourneysPromo';
import { PageHeader } from '@/components/PageHeader/PageHeader';

const POOL_LIMIT = 50;

export function BookingsPage() {
    // Sort by check-in descending so the window always contains every active and
    // upcoming stay (future dates) plus the most recent past trips; only deep
    // history is truncated when a user exceeds POOL_LIMIT.
    const { data, isLoading } = useBookings({ page: 1, limit: POOL_LIMIT, sortBy: 'checkIn', sortOrder: 'desc' });
    const all = data?.data ?? [];
    const total = data?.total ?? all.length;

    return (
        <Container size='xl' py='sm'>
            <Stack gap='lg'>
                <Breadcrumbs
                    separator={<IconChevronRight size={14} stroke={1.5} color='var(--mantine-other-text-secondary)' />}
                >
                    <Anchor component={Link} to='/' size='sm' c='dimmed'>
                        Home
                    </Anchor>
                    <Text size='sm' fw={500}>
                        My Bookings
                    </Text>
                </Breadcrumbs>

                <PageHeader title='My Bookings' subtitle='Your upcoming, active, and past journeys — in one place.' />

                {isLoading ? (
                    <Stack gap='xl'>
                        <Skeleton height={380} radius='lg' />
                        <Stack gap='md'>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} height={200} radius='lg' />
                            ))}
                        </Stack>
                    </Stack>
                ) : all.length === 0 ? (
                    <EmptyBookings />
                ) : (
                    <BookingsContent bookings={all} total={total} />
                )}
            </Stack>
        </Container>
    );
}

function BookingsContent({ bookings, total }: { bookings: BookingWithRelations[]; total: number }) {
    const hero = pickHero(bookings);
    const { active, upcoming, past, cancelled } = partitionBookings(bookings, hero);

    return (
        <Stack gap='xl'>
            {hero && <NextDepartureHero booking={hero} />}
            <BookingSection title='Currently Staying' bookings={active} variant='active' />
            <BookingSection title='Upcoming' bookings={upcoming} variant='upcoming' />
            <BookingSection title='Past' bookings={past} variant='past' />
            <BookingSection title='Cancelled' bookings={cancelled} variant='cancelled' />

            {bookings.length === 1 && <MoreJourneysPromo />}

            {total > bookings.length && (
                <Text size='sm' c='dimmed' ta='center'>
                    Showing your {bookings.length} most recent stays of {total}.
                </Text>
            )}
        </Stack>
    );
}
