import { Badge, Box, Card, Group, Image, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconBuildingOff, IconBuildingSkyscraper, IconMapPin } from '@tabler/icons-react';
import type { Property } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import classes from './PropertyPickerGrid.module.css';

interface Props {
    properties: Property[];
    isLoading: boolean;
    onSelect: (propertyId: string) => void;
}

/**
 * Visual property picker — empty state when no property is selected yet.
 * Each card is clickable and selects a property to load the dashboard.
 * Visual treatment mirrors the public PropertyCard (radius, hover, image
 * overlay, type badge, animated reveal) while staying focused on the admin
 * selection use case — no price, no amenities, no link wrapper.
 */
export function PropertyPickerGrid({ properties, isLoading, onSelect }: Props) {
    return (
        <Stack gap='lg'>
            <Stack gap={4}>
                <Title order={2}>Feedback</Title>
                <Text c='dimmed'>Select a property to view feedback insights</Text>
            </Stack>

            {isLoading ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing='md'>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} h={320} radius='lg' />
                    ))}
                </SimpleGrid>
            ) : properties.length === 0 ? (
                <EmptyState
                    variant='compact'
                    icon={IconBuildingOff}
                    title='No properties yet'
                    body='Create a property first to start collecting feedback.'
                />
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing='md'>
                    {properties.map((property, index) => {
                        const hasPhoto = property.photos.length > 0 && !!property.photos[0];
                        return (
                            <Card
                                key={property.id}
                                padding={0}
                                radius='lg'
                                className={classes.pickerCard}
                                style={{ animationDelay: `${index * 0.08}s` }}
                                onClick={() => onSelect(property.id)}
                                role='button'
                                tabIndex={0}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelect(property.id);
                                    }
                                }}
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
                                            <IconBuildingSkyscraper
                                                size={48}
                                                stroke={1}
                                                color='rgba(255, 255, 255, 0.3)'
                                            />
                                        </Box>
                                    )}
                                    <div className={classes.cardImageOverlay} />
                                    <Badge className={classes.cardTypeBadge} size='xs' radius='sm'>
                                        {property.type}
                                    </Badge>
                                </Card.Section>

                                <Stack gap={8} p='md'>
                                    <Text fw={700} size='md' lineClamp={1}>
                                        {property.title}
                                    </Text>
                                    <Group gap={4}>
                                        <IconMapPin
                                            size={14}
                                            stroke={1.5}
                                            color='var(--mantine-other-text-secondary)'
                                        />
                                        <Text size='sm' c='dimmed'>
                                            {property.city}
                                        </Text>
                                    </Group>
                                </Stack>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            )}
        </Stack>
    );
}
