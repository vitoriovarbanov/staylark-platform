import { Link } from 'react-router';
import { Card, Image, Text, Group, Stack, Badge, Skeleton, Box } from '@mantine/core';
import { IconMapPin, IconBuildingSkyscraper, IconCalendarX } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { Property, BookedRange } from '@staylark/contract';
import classes from './PropertyCard.module.css';

interface PropertyCardProps {
    property: Property;
    href: string;
    priceLabel: string;
    index?: number;
    /** Overlapping booked ranges for the searched dates — set only when unavailable. */
    blockedRanges?: BookedRange[];
}

/** "Booked 6–9 Jul" for a single span, or a generic note when several apply. */
function formatBlocked(ranges: BookedRange[]): string {
    if (ranges.length !== 1) return 'Some of your dates are booked';
    const start = dayjs(ranges[0].checkIn);
    const end = dayjs(ranges[0].checkOut);
    return start.month() === end.month()
        ? `Booked ${start.format('D')}–${end.format('D MMM')}`
        : `Booked ${start.format('D MMM')} – ${end.format('D MMM')}`;
}

export function PropertyCardSkeleton() {
    return (
        <Card padding={0} radius='lg' className={classes.propertyCard} style={{ animation: 'none', opacity: 1 }}>
            <Skeleton height={220} radius={0} />
            <Stack gap={8} p='md'>
                <Skeleton height={18} width='75%' />
                <Skeleton height={14} width='40%' />
                <Group gap={4}>
                    <Skeleton height={20} width={60} radius='sm' />
                    <Skeleton height={20} width={50} radius='sm' />
                    <Skeleton height={20} width={55} radius='sm' />
                </Group>
            </Stack>
        </Card>
    );
}

export function PropertyCard({ property, href, priceLabel, index = 0, blockedRanges }: PropertyCardProps) {
    const hasPhoto = property.photos.length > 0 && !!property.photos[0];
    const isBlocked = !!blockedRanges && blockedRanges.length > 0;

    return (
        <Card
            padding={0}
            radius='lg'
            className={classes.propertyCard}
            component={Link}
            to={href}
            data-blocked={isBlocked || undefined}
            style={{ animationDelay: `${index * 0.08}s` }}
        >
            <Card.Section className={classes.cardImageSection}>
                {hasPhoto ? (
                    <Image
                        src={property.photos[0]}
                        height={220}
                        alt={property.title}
                        loading='lazy'
                        className={classes.cardImage}
                    />
                ) : (
                    <Box className={classes.cardPlaceholder}>
                        <IconBuildingSkyscraper size={48} stroke={1} color='rgba(255, 255, 255, 0.3)' />
                    </Box>
                )}

                <div className={classes.cardImageOverlay} />

                <Badge className={classes.cardTypeBadge} size='xs' radius='sm'>
                    {property.type}
                </Badge>

                {isBlocked && (
                    <Badge
                        className={`${classes.cardTypeBadge} ${classes.cardUnavailBadge}`}
                        size='xs'
                        radius='sm'
                        leftSection={<IconCalendarX size={11} stroke={2.5} />}
                    >
                        Unavailable
                    </Badge>
                )}

                <div className={classes.cardPriceOverlay}>
                    <Text fw={700} size='md' c='white'>
                        {priceLabel}
                    </Text>
                </div>
            </Card.Section>

            <Stack gap={8} p='md'>
                <div>
                    <Text fw={700} size='md' lineClamp={1}>
                        {property.title}
                    </Text>
                    <Group gap={4} mt={2}>
                        <IconMapPin size={14} stroke={1.5} color='var(--mantine-other-text-secondary)' />
                        <Text size='sm' c='dimmed'>
                            {property.city}
                        </Text>
                    </Group>
                    {isBlocked && (
                        <Group gap={4} mt={4} wrap='nowrap'>
                            <IconCalendarX size={14} stroke={1.8} color='var(--mantine-color-red-6)' />
                            <Text size='sm' c='red.7' fw={500}>
                                {formatBlocked(blockedRanges)} · try other dates
                            </Text>
                        </Group>
                    )}
                </div>

                {property.amenities.length > 0 && (
                    <Group gap={4}>
                        {property.amenities.slice(0, 3).map(a => (
                            <Badge key={a} size='xs' variant='outline' color='gray' radius='sm'>
                                {a}
                            </Badge>
                        ))}
                        {property.amenities.length > 3 && (
                            <Badge size='xs' variant='outline' color='gray' radius='sm'>
                                +{property.amenities.length - 3}
                            </Badge>
                        )}
                    </Group>
                )}
            </Stack>
        </Card>
    );
}
