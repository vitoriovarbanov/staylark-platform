import { Link } from 'react-router';
import { Anchor, Box, Card, Group, Image, Stack, Text } from '@mantine/core';
import { IconArrowRight, IconBuildingSkyscraper, IconLuggage, IconMapPin } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { cloudinaryUrl, type BookingStatus } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { CardGrid } from '@/components/CardGrid/CardGrid';
import { useLiveCountdown } from '@/pages/Bookings/utils/bookings.utils';
import { useBookings, type BookingWithRelations } from '@/hooks/api/use-bookings';
import classes from './RecentTrips.module.css';

const RECENT_LIMIT = 6;

function nightsBetween(checkIn: string, checkOut: string): number {
    return Math.max(0, dayjs(checkOut).diff(dayjs(checkIn), 'day'));
}

const STATUS_CHIP: Record<BookingStatus, { label: string; tone: 'amber' | 'blue' | 'red' }> = {
    PENDING: { label: 'Pending', tone: 'amber' },
    CONFIRMED: { label: '', tone: 'blue' }, // label comes from the live countdown
    ACTIVE: { label: 'Staying now', tone: 'blue' },
    COMPLETED: { label: 'Stayed', tone: 'amber' },
    CANCELLED: { label: 'Cancelled', tone: 'red' }
};

/** One status signal per card, rendered on the photo so it never touches the title. */
function TripStatusChip({ status, checkIn }: { status: BookingStatus; checkIn: string }) {
    const countdown = useLiveCountdown(checkIn);
    const { label, tone } = STATUS_CHIP[status];
    const text = status === 'CONFIRMED' ? countdown : label;

    return (
        <span className={classes.statusChip} data-tone={tone}>
            <span className={classes.statusDot} aria-hidden='true' />
            {text}
        </span>
    );
}

function TripCard({ booking }: { booking: BookingWithRelations }) {
    const { property, checkIn, checkOut, status } = booking;
    const photo = property.photos[0];
    const nights = nightsBetween(checkIn, checkOut);

    return (
        <Card
            component={Link}
            to={`/properties/${property.id}`}
            padding={0}
            radius='lg'
            withBorder
            className={classes.card}
            aria-label={`View ${property.title}`}
        >
            <Card.Section className={classes.media}>
                {photo ? (
                    <Image
                        src={cloudinaryUrl(photo, { width: 600, height: 360, crop: 'fill' })}
                        h={150}
                        alt={property.title}
                        loading='lazy'
                        className={classes.image}
                    />
                ) : (
                    <Box className={classes.placeholder}>
                        <IconBuildingSkyscraper size={40} stroke={1} />
                    </Box>
                )}

                <TripStatusChip status={status} checkIn={checkIn} />
            </Card.Section>

            <Stack gap={6} p='md' className={classes.content}>
                <Text fw={700} size='md' lineClamp={1} className={classes.title}>
                    {property.title}
                </Text>
                <Group gap={4} wrap='nowrap'>
                    <IconMapPin size={14} stroke={1.5} color='var(--mantine-other-text-secondary)' />
                    <Text size='sm' c='dimmed'>
                        {property.city}
                    </Text>
                </Group>
                <Group gap={6} mt={2}>
                    <Text size='sm' className={classes.dates}>
                        {dayjs(checkIn).format('MMM D')} – {dayjs(checkOut).format('MMM D, YYYY')}
                    </Text>
                    <Text size='sm' c='dimmed'>
                        · {nights} {nights === 1 ? 'night' : 'nights'}
                    </Text>
                </Group>
            </Stack>
        </Card>
    );
}

export function RecentTrips() {
    const { data, isLoading } = useBookings({
        sortBy: 'checkIn',
        sortOrder: 'desc',
        limit: RECENT_LIMIT
    });

    const trips = data?.data ?? [];

    if (isLoading) {
        return (
            <CardGrid<BookingWithRelations>
                data={[]}
                isLoading
                skeletonCount={3}
                getCardKey={b => b.id}
                renderCard={() => null}
            />
        );
    }

    if (trips.length === 0) {
        return (
            <EmptyState
                variant='compact'
                icon={IconLuggage}
                title='No trips yet'
                body='Your past and upcoming stays will appear here.'
                action={
                    <Anchor component={Link} to='/' fw={600}>
                        Explore stays
                    </Anchor>
                }
            />
        );
    }

    return (
        <Stack gap='sm'>
            <CardGrid<BookingWithRelations>
                data={trips}
                getCardKey={b => b.id}
                renderCard={b => <TripCard booking={b} />}
            />
            <Group justify='flex-end'>
                <Anchor component={Link} to='/bookings' className={classes.viewAll}>
                    View all
                    <IconArrowRight size={15} stroke={2} />
                </Anchor>
            </Group>
        </Stack>
    );
}
